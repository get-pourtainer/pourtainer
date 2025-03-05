package com.pourtainer.mobile

import Container
import ContainerListItem
import LogLine
import WidgetIntentState
import android.content.Context
import android.content.Intent
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import savedInstancesKey
import savedWidgetStateKey
import java.util.concurrent.TimeUnit

class ContainerWidgetReceiver: GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = ContainerWidget()

    companion object {
        const val sharedPreferencesGroup = "group.com.pourtainer.mobile"
        val selectedContainerKey = stringPreferencesKey("selectedContainer")
        val widgetStateKey = stringPreferencesKey("state")
        val containerMetadataKey = stringPreferencesKey("containerMetadata")
        val instancesKey = stringPreferencesKey("instances")
        val containerLogsKey = stringPreferencesKey("containerLogs")
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "android.appwidget.action.APPWIDGET_UPDATE") {
            CoroutineScope(Dispatchers.IO).launch {
                val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(ContainerWidget::class.java)
                val sharedPrefs = context.getSharedPreferences(sharedPreferencesGroup, Context.MODE_PRIVATE)

                glanceIds.forEach { glanceId ->
                    updateAppWidgetState(
                        context = context,
                        definition = PreferencesGlanceStateDefinition,
                        glanceId = glanceId
                    ) { prefs ->
                        val rawContainer = prefs[selectedContainerKey] ?: "null"
                        val container = Gson().fromJson(rawContainer, ContainerListItem::class.java)

                        if (container != null) {
                            schedulePeriodicWork(context, glanceId, container)
                        }

                        prefs.toMutablePreferences().apply {
                            this[instancesKey] = sharedPrefs.getString(savedInstancesKey, "null").toString()
                            this[widgetStateKey] = sharedPrefs.getInt(savedWidgetStateKey, WidgetIntentState.LOADING.value).toString()
                        }
                    }

                    glanceAppWidget.update(context, glanceId)
                }
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)

        appWidgetIds.forEach { appWidgetId ->
            val glanceId = GlanceAppWidgetManager(context).getGlanceIdBy(appWidgetId)
            val workManager = WorkManager.getInstance(context)

            // widget should no longer get periodic updates
            workManager.cancelUniqueWork("widget_update_${glanceId.hashCode()}")
        }
    }

    fun onContainerSelected(context: Context, glanceId: GlanceId, container: ContainerListItem?) {
        if (container == null) {
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(ContainerWidget::class.java)

            glanceIds.forEach { runningGlanceId ->
                if (runningGlanceId == glanceId) {
                    updateAppWidgetState(
                        context = context,
                        definition = PreferencesGlanceStateDefinition,
                        glanceId = glanceId
                    ) { prefs ->
                        prefs.toMutablePreferences().apply {
                            this[selectedContainerKey] = Gson().toJson(container)
                        }
                    }

                    glanceAppWidget.update(context, glanceId)
                    schedulePeriodicWork(context, glanceId, container)
                }
            }
        }
    }

    /**
     * Updates the widget with container and log information
     * 
     * @param context Application context
     * @param glanceId ID of the widget to update
     * @param container Container data to display
     * @param logs List of log lines to display
     */
    fun onStatusUpdated(context: Context, glanceId: GlanceId, container: Container?, logs: List<LogLine> = emptyList()) {
        CoroutineScope(Dispatchers.IO).launch {
            val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(ContainerWidget::class.java)

            glanceIds.forEach { runningGlanceId ->
                if (runningGlanceId == glanceId) {
                    updateAppWidgetState(
                        context = context,
                        definition = PreferencesGlanceStateDefinition,
                        glanceId = glanceId
                    ) { prefs ->
                        prefs.toMutablePreferences().apply {
                            // Store container data
                            this[containerMetadataKey] = Gson().toJson(container)
                            
                            // Store log data
                            this[containerLogsKey] = Gson().toJson(logs)
                            
                            // Update widget state to show we have container data
                            this[widgetStateKey] = if (container != null) {
                                WidgetIntentState.HAS_CONTAINERS.toString()
                            } else {
                                WidgetIntentState.NO_CONTAINERS.toString()
                            }
                        }
                    }

                    glanceAppWidget.update(context, glanceId)
                    
                    // If container was updated successfully, adjust the refresh interval based on status
                    if (container != null) {
                        updateRefreshInterval(context, glanceId, container)
                    }
                }
            }
        }
    }

    fun onFetchError(context: Context, glanceId: GlanceId) {
        CoroutineScope(Dispatchers.IO).launch {
            val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(ContainerWidget::class.java)

            glanceIds.forEach { runningGlanceId ->
                if (runningGlanceId == glanceId) {
                    updateAppWidgetState(
                        context = context,
                        definition = PreferencesGlanceStateDefinition,
                        glanceId = glanceId
                    ) { prefs ->
                        prefs.toMutablePreferences().apply {
                            this[widgetStateKey] = WidgetIntentState.API_FAILED.toString()
                        }
                    }

                    glanceAppWidget.update(context, glanceId)
                }
            }
        }
    }

    /**
     * Schedules periodic work to update the widget with container data
     * Initial schedule with 15-minute interval
     */
    private fun schedulePeriodicWork(context: Context, glanceId: GlanceId, container: ContainerListItem) {
        val workManager = WorkManager.getInstance(context)

        // cancel previous jobs if present
        workManager.cancelUniqueWork("widget_update_${glanceId.hashCode()}")

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val work = PeriodicWorkRequestBuilder<ContainerWidgetDataWorker>(15, TimeUnit.MINUTES)
            .setInputData(
                workDataOf(
                    ContainerWidgetDataWorker.containerKey to Gson().toJson(container),
                    ContainerWidgetDataWorker.glanceIdKey to glanceId.hashCode().toString()
                )
            )
            .setConstraints(constraints)
            .build()

        workManager.enqueueUniquePeriodicWork(
            "widget_update_${glanceId.hashCode()}",
            ExistingPeriodicWorkPolicy.UPDATE,
            work
        )
    }
    
    /**
     * Updates the refresh interval based on container status
     * Similar to the iOS implementation's smart refresh policy
     */
    private suspend fun updateRefreshInterval(context: Context, glanceId: GlanceId, container: Container) {
        val workManager = WorkManager.getInstance(context)
        
        // Get the refresh interval based on container status
        val refreshMinutes = when (container.State.Status) {
            "running" -> 5     // Active containers update more frequently (5 minutes)
            "exited" -> 30     // Inactive containers update less frequently (30 minutes)
            else -> 15         // Unknown status - use a moderate refresh rate (15 minutes)
        }
        
        // Get the previously selected container to use in the new work request
        var selectedContainerJson = "null"
        
        updateAppWidgetState(
            context = context,
            definition = PreferencesGlanceStateDefinition,
            glanceId = glanceId
        ) { prefs -> 
            selectedContainerJson = prefs[selectedContainerKey] ?: "null"
            prefs // Return the preferences unmodified
        }
        
        // Create new work request with adjusted interval
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val work = PeriodicWorkRequestBuilder<ContainerWidgetDataWorker>(refreshMinutes.toLong(), TimeUnit.MINUTES)
            .setInputData(
                workDataOf(
                    ContainerWidgetDataWorker.containerKey to selectedContainerJson,
                    ContainerWidgetDataWorker.glanceIdKey to glanceId.hashCode().toString()
                )
            )
            .setConstraints(constraints)
            .build()

        // Update the work schedule
        workManager.enqueueUniquePeriodicWork(
            "widget_update_${glanceId.hashCode()}",
            ExistingPeriodicWorkPolicy.UPDATE,
            work
        )
    }
}
