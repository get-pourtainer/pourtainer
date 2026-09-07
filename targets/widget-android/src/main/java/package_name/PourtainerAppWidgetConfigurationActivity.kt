package com.pourtainer.mobile

import Container
import WidgetIntentState
import android.appwidget.AppWidgetManager
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
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import loadConnections
import stackNameFrom

class PourtainerAppWidgetConfigurationActivity : AppCompatActivity() {
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

        val connections = loadConnections(this)

        setContent {
            var widgetState by remember { mutableStateOf(WidgetIntentState.LOADING) }
            val options = remember { mutableStateListOf<Container>() }
            var selectedContainer by remember { mutableStateOf<Container?>(null) }

            LaunchedEffect(Unit) {
                var anyError = false

                // Every connection and endpoint is listed concurrently; one
                // unreachable endpoint must not hide the others
                val listed = connections.map { connection ->
                    async {
                        val endpoints = try {
                            fetchEndpoints(connection)
                        } catch (error: Exception) {
                            anyError = true
                            return@async emptyList<Container>()
                        }

                        endpoints.map { endpoint ->
                            async {
                                try {
                                    fetchContainers(connection, endpoint).map { container ->
                                        Container(
                                            id = container.Id,
                                            name = (container.Names.firstOrNull() ?: "Unknown").removePrefix("/"),
                                            state = container.State,
                                            stackName = stackNameFrom(container.Labels),
                                            connection = connection,
                                            endpoint = endpoint
                                        )
                                    }
                                } catch (error: Exception) {
                                    anyError = true
                                    emptyList()
                                }
                            }
                        }.awaitAll().flatten()
                    }
                }.awaitAll().flatten()

                options.addAll(listed)

                widgetState = when {
                    options.isEmpty() && anyError -> WidgetIntentState.API_FAILED
                    options.isEmpty() -> WidgetIntentState.NO_CONTAINERS
                    else -> WidgetIntentState.HAS_CONTAINERS
                }
            }

            setupUI(
                connections.isNotEmpty(),
                widgetState,
                selectedContainer,
                options,
                appWidgetId
            ) { container ->
                selectedContainer = container
            }
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
                    val container = selectedContainer
                    if (container != null) {
                        lifecycleScope.launch {
                            ContainerWidgetReceiver().onContainerSelected(applicationContext, appWidgetId, container)

                            setResult(RESULT_OK, Intent().apply {
                                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                            })
                            finish()
                        }
                    }
                },
                openApp = {
                    packageManager.getLaunchIntentForPackage(packageName)?.let { startActivity(it) }
                }
            )
        }
    }
}
