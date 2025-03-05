package com.pourtainer.mobile

import ContainerListItem
import WidgetIntentState
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.glance.appwidget.GlanceAppWidgetManager
import appGroupName
import com.google.gson.Gson
import expo.modules.widgetkit.Instance
import androidx.core.content.edit
import savedInstancesKey
import savedWidgetStateKey

class PourtainerAppWidgetConfigurationActivity: AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setResult(RESULT_CANCELED)

        val appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()

            return
        }

        val prefs = getSharedPreferences(appGroupName, Context.MODE_PRIVATE)
        val rawInstances = prefs.getString(savedInstancesKey, "[]")
        val instances = Gson().fromJson(rawInstances, Array<Instance>::class.java) ?: emptyArray()

        setWidgetState(WidgetIntentState.LOADING)

        setContent {
            var widgetState = remember { mutableStateOf(WidgetIntentState.LOADING) }
            val options = remember { mutableStateListOf<ContainerListItem>() }
            var selectedContainer by remember { mutableStateOf<ContainerListItem?>(null) }

            LaunchedEffect(Unit) {
                for (instance in instances) {
                    try {
                        val endpoints = fetchEndpoints(instance)

                        for (endpoint in endpoints) {
                            val containers = fetchContainers(instance, endpoint)

                            options.addAll(containers.map { container ->
                                ContainerListItem(
                                    id = container.Id,
                                    containerName = container.Names.firstOrNull() ?: "Unknown",
                                    instance = instance,
                                    endpoint = endpoint
                                )
                            })
                        }

                        val nextState = if (instances.isEmpty()) WidgetIntentState.NO_CONTAINERS else WidgetIntentState.HAS_CONTAINERS

                        setWidgetState(nextState)
                        widgetState.value = nextState

                    } catch (e: Exception) {
                        setWidgetState(WidgetIntentState.API_FAILED)
                        widgetState.value = WidgetIntentState.API_FAILED
                    }
                }
            }

            setupUI(
                instances.isNotEmpty(),
                widgetState.value,
                selectedContainer,
                options,
                appWidgetId,
                { container ->
                    selectedContainer = container
                }
            )
        }
    }

    @Composable
    private fun setupUI(
        isAuthorized: Boolean,
        state: WidgetIntentState,
        selectedContainer: ContainerListItem?,
        containers: List<ContainerListItem>,
        appWidgetId: Int,
        onContainerSelected: (selectedContainer: ContainerListItem?) -> Unit
    ) {
        PourtainerMaterialTheme {
            ContainerWidgetConfigurationView(
                isAuthorized,
                state,
                selectedContainer,
                containers,
                onContainerSelected,
                onDone = {
                    val glanceId = GlanceAppWidgetManager(applicationContext).getGlanceIdBy(appWidgetId)
                    ContainerWidgetReceiver().onContainerSelected(applicationContext, glanceId, selectedContainer)

                    val resultValue = Intent().apply {
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                    }

                    setResult(RESULT_OK, resultValue)
                    finish()
                },
                openApp = {
                    packageManager.getLaunchIntentForPackage(packageName)?.let { startActivity(it) }
                }
            )
        }
    }

    private fun setWidgetState(state: WidgetIntentState) {
        val prefs = getSharedPreferences(appGroupName, Context.MODE_PRIVATE)

        prefs.edit {
            putInt(savedWidgetStateKey, state.value)
            apply()
        }
    }
}

