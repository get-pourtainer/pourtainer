package com.pourtainer.mobile

import ContainerListItem
import WidgetIntentState
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.lifecycle.lifecycleScope
import appGroupName
import com.google.gson.Gson
import expo.modules.widgetkit.Instance
import androidx.core.content.edit
import kotlinx.coroutines.launch
import savedInstancesKey
import savedWidgetStateKey

class PourtainerAppWidgetConfigurationActivity : AppCompatActivity() {
    private var selectedContainer: ContainerListItem? = null

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

        lifecycleScope.launch {
            val options = mutableListOf<ContainerListItem>()

            setWidgetState(WidgetIntentState.LOADING)

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

                } catch (e: Exception) {
                    setWidgetState(WidgetIntentState.API_FAILED)
                }
            }

            setWidgetState(if (instances.isEmpty()) WidgetIntentState.NO_CONTAINERS else WidgetIntentState.NO_CONTAINERS)

            setupUI(instances.isNotEmpty(), options, appWidgetId)
        }
    }

    private fun setupUI(isAuthorized: Boolean, containers: List<ContainerListItem>, appWidgetId: Int) {
        setContent {
            PourtainerMaterialTheme {
                WidgetConfigurationView(
                    isAuthorized,
                    containers,
                    onContainerSelected = { container ->
                        selectedContainer = container
                    },
                    onDone = {
                        val glanceId = GlanceAppWidgetManager(applicationContext).getGlanceIdBy(appWidgetId)
                        PourtainerWidgetReceiver().onContainerSelected(applicationContext, glanceId, selectedContainer)

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
    }

    private fun setWidgetState(state: WidgetIntentState) {
        val prefs = getSharedPreferences(appGroupName, Context.MODE_PRIVATE)

        prefs.edit {
            putInt(savedWidgetStateKey, state.value)
            apply()
        }
    }
}

