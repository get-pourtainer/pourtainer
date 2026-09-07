package com.pourtainer.mobile

import ContainerMetadata
import LogLine
import SelectedContainer
import WidgetIntentState
import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.getAppWidgetState
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import loadConnections

class ContainerWidgetDataWorker(context: Context, workerParams: WorkerParameters) :
    CoroutineWorker(context, workerParams) {

    companion object {
        const val appWidgetIdKey = "app_widget_id"
        private const val MAX_LOG_LINES = 20
        private const val MAX_LINE_LENGTH = 150
    }

    override suspend fun doWork(): Result {
        val appWidgetId = inputData.getInt(appWidgetIdKey, -1)
        if (appWidgetId < 0) return Result.failure()

        val context = applicationContext
        val glanceId = runCatching { GlanceAppWidgetManager(context).getGlanceIdBy(appWidgetId) }
            .getOrNull()
        if (glanceId == null) {
            // The widget no longer exists; stop its work for good
            ContainerWidgetReceiver.cancelWork(context, appWidgetId)
            return Result.failure()
        }

        val prefs = getAppWidgetState(context, PreferencesGlanceStateDefinition, glanceId)
        val selected = prefs[ContainerWidgetReceiver.selectedContainerKey]
            ?.let { runCatching { Gson().fromJson(it, SelectedContainer::class.java) }.getOrNull() }
            ?: return Result.success() // not configured yet; the view says so
        val hasCachedMetadata = prefs[ContainerWidgetReceiver.containerMetadataKey] != null

        val connection = loadConnections(context).firstOrNull { it.id == selected.connectionId }
        if (connection == null) {
            writeState(glanceId, WidgetIntentState.API_FAILED)
            return Result.success()
        }

        // Independent requests, so they run concurrently; unreadable logs only
        // cost the log lines
        val (container, logs) = try {
            coroutineScope {
                val logLines = async {
                    runCatching { toLogLines(fetchLogs(connection, selected.endpoint, selected.id)) }
                        .getOrDefault(emptyList())
                }
                fetchContainer(connection, selected.endpoint, selected.id) to logLines.await()
            }
        } catch (error: HttpException) {
            if (error.isNotFound) {
                writeState(glanceId, WidgetIntentState.NOT_FOUND)
                return Result.success()
            }
            return onTransientFailure(glanceId, hasCachedMetadata)
        } catch (error: Exception) {
            return onTransientFailure(glanceId, hasCachedMetadata)
        }

        writeState(glanceId, WidgetIntentState.HAS_CONTAINERS, ContainerMetadata.from(container), logs)
        return Result.success()
    }

    /** Keep the last good status on a transient failure; only report when nothing is cached. */
    private suspend fun onTransientFailure(glanceId: GlanceId, hasCachedMetadata: Boolean): Result {
        if (!hasCachedMetadata) {
            writeState(glanceId, WidgetIntentState.API_FAILED)
        }
        return Result.retry()
    }

    private suspend fun writeState(
        glanceId: GlanceId,
        state: WidgetIntentState,
        metadata: ContainerMetadata? = null,
        logs: List<LogLine>? = null
    ) {
        updateAppWidgetState(applicationContext, PreferencesGlanceStateDefinition, glanceId) { prefs ->
            prefs.toMutablePreferences().apply {
                this[ContainerWidgetReceiver.widgetStateKey] = state.name
                if (metadata != null) this[ContainerWidgetReceiver.containerMetadataKey] = Gson().toJson(metadata)
                if (logs != null) this[ContainerWidgetReceiver.containerLogsKey] = Gson().toJson(logs)
                if (state == WidgetIntentState.NOT_FOUND) {
                    remove(ContainerWidgetReceiver.containerMetadataKey)
                    remove(ContainerWidgetReceiver.containerLogsKey)
                }
            }
        }

        // Written and rendered before doWork returns
        ContainerWidget().update(applicationContext, glanceId)
    }

    private fun toLogLines(logs: String): List<LogLine> =
        logs.split("\n")
            .filter { it.isNotBlank() }
            .takeLast(MAX_LOG_LINES)
            .map { line ->
                LogLine(if (line.length > MAX_LINE_LENGTH) line.substring(0, MAX_LINE_LENGTH) + "..." else line)
            }
}
