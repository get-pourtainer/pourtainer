package com.pourtainer.mobile

import Container
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
import expo.modules.widgetkit.Connection
import androidx.core.content.edit
import savedConnectionsKey
import savedWidgetStateKey

class PourtainerAppWidgetConfigurationActivity: AppCompatActivity() {
    override fun onCreate(savedConnectionState: Bundle?) {
        super.onCreate(savedConnectionState)

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
        val rawConnections = prefs.getString(savedConnectionsKey, "[]")
        val connections = Gson().fromJson(rawConnections, Array<Connection>::class.java) ?: emptyArray()

        setWidgetState(WidgetIntentState.LOADING)

        setContent {
            var widgetState = remember { mutableStateOf(WidgetIntentState.LOADING) }
            val options = remember { mutableStateListOf<Container>() }
            var selectedContainer by remember { mutableStateOf<Container?>(null) }

            LaunchedEffect(Unit) {
                for (connection in connections) {
                    try {
                        val endpoints = fetchEndpoints(connection)

                        for (endpoint in endpoints) {
                            val containers = fetchContainers(connection, endpoint)

                            options.addAll(containers.map { container ->
                                // Clean container name by removing leading slash if present
                                val containerName = container.Names.firstOrNull() ?: "Unknown"
                                val cleanedName = if (containerName.startsWith("/")) {
                                    containerName.substring(1)
                                } else {
                                    containerName
                                }
                                
                                Container(
                                    id = container.Id,
                                    name = cleanedName,
									state = container.State,
                                    connection = connection,
                                    endpoint = endpoint,
                                    stackName = container.Labels?.get("com.docker.compose.project.name")
                                )
                            })
                        }

                        val nextState = if (connections.isEmpty()) WidgetIntentState.NO_CONTAINERS else WidgetIntentState.HAS_CONTAINERS

                        setWidgetState(nextState)
                        widgetState.value = nextState

                    } catch (e: Exception) {
                        setWidgetState(WidgetIntentState.API_FAILED)
                        widgetState.value = WidgetIntentState.API_FAILED
                    }
                }
            }

            setupUI(
                connections.isNotEmpty(),
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
        selectedContainer: Container?,
        containers: List<Container>,
        appWidgetId: Int,
        onContainerSelected: (selectedContainer: Container?) -> Unit
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

