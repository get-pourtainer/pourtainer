package com.pourtainer.mobile

import Container
import SelectedContainer
import WidgetIntentState
import android.appwidget.AppWidgetManager
import android.content.Context
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.state.getAppWidgetState
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class ContainerWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = ContainerWidget()

    companion object {
        val selectedContainerKey = stringPreferencesKey("selectedContainer")
        val widgetStateKey = stringPreferencesKey("state")
        val containerMetadataKey = stringPreferencesKey("containerMetadata")
        val containerLogsKey = stringPreferencesKey("containerLogs")

        // WorkManager clamps anything shorter to this anyway
        private const val REFRESH_MINUTES = 15L

        fun periodicWorkName(appWidgetId: Int) = "widget_update_$appWidgetId"
        fun immediateWorkName(appWidgetId: Int) = "widget_update_now_$appWidgetId"

        private fun networkConstraints() =
            Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        /** KEEP on update ticks so the period is not reset; UPDATE on (re)configuration. */
        fun ensurePeriodicWork(
            context: Context,
            appWidgetId: Int,
            policy: ExistingPeriodicWorkPolicy = ExistingPeriodicWorkPolicy.KEEP
        ) {
            val work = PeriodicWorkRequestBuilder<ContainerWidgetDataWorker>(REFRESH_MINUTES, TimeUnit.MINUTES)
                .setInputData(workDataOf(ContainerWidgetDataWorker.appWidgetIdKey to appWidgetId))
                .setConstraints(networkConstraints())
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(periodicWorkName(appWidgetId), policy, work)
        }

        /** Fetches right away, so a freshly configured widget does not wait a full period. */
        fun refreshNow(context: Context, appWidgetId: Int) {
            val work = OneTimeWorkRequestBuilder<ContainerWidgetDataWorker>()
                .setInputData(workDataOf(ContainerWidgetDataWorker.appWidgetIdKey to appWidgetId))
                .setConstraints(networkConstraints())
                .build()

            WorkManager.getInstance(context)
                .enqueueUniqueWork(immediateWorkName(appWidgetId), ExistingWorkPolicy.REPLACE, work)
        }

        fun cancelWork(context: Context, appWidgetId: Int) {
            val workManager = WorkManager.getInstance(context)
            workManager.cancelUniqueWork(periodicWorkName(appWidgetId))
            workManager.cancelUniqueWork(immediateWorkName(appWidgetId))
        }
    }

    // Glance's own onReceive dispatches onUpdate/onDeleted/resizes and registers the
    // widget ids that GlanceAppWidgetManager resolves; it must not be overridden.
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val manager = GlanceAppWidgetManager(context)
                appWidgetIds.forEach { appWidgetId ->
                    val glanceId = runCatching { manager.getGlanceIdBy(appWidgetId) }.getOrNull()
                        ?: return@forEach
                    val prefs = getAppWidgetState(context, PreferencesGlanceStateDefinition, glanceId)
                    if (prefs[selectedContainerKey] != null) {
                        ensurePeriodicWork(context, appWidgetId)
                    }
                }
            } finally {
                pendingResult.finish()
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        appWidgetIds.forEach { cancelWork(context, it) }
    }

    /** Called from the configuration activity once the user picks a container. */
    suspend fun onContainerSelected(context: Context, appWidgetId: Int, container: Container) {
        val glanceId = GlanceAppWidgetManager(context).getGlanceIdBy(appWidgetId)

        updateAppWidgetState(context, PreferencesGlanceStateDefinition, glanceId) { prefs ->
            prefs.toMutablePreferences().apply {
                this[selectedContainerKey] = Gson().toJson(SelectedContainer.from(container))
                this[widgetStateKey] = WidgetIntentState.LOADING.name
                remove(containerMetadataKey)
                remove(containerLogsKey)
            }
        }

        glanceAppWidget.update(context, glanceId)
        ensurePeriodicWork(context, appWidgetId, ExistingPeriodicWorkPolicy.UPDATE)
        refreshNow(context, appWidgetId)
    }
}
