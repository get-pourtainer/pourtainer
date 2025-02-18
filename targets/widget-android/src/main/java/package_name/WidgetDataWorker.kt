package com.pourtainer.mobile

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import expo.modules.widgetkit.Client
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class WidgetDataWorker(context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {
    override suspend fun doWork(): Result {
        val boxedGlanceId = inputData.getString(glanceIdKey) ?: throw Exception("Missing glance id")
        val glanceId = GlanceAppWidgetManager(context = applicationContext)
            .getGlanceIds(PourtainerWidget::class.java).firstOrNull { id -> id.hashCode() == boxedGlanceId.toInt()}

        if (glanceId == null) {
            return Result.failure()
        }

        return try {
            val response = fetchApiData()
            updateWidget(applicationContext, glanceId, response)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private suspend fun fetchApiData(): Container = withContext(Dispatchers.IO) {
        val prefs = applicationContext.getSharedPreferences(PourtainerWidgetReceiver.sharedPreferencesGroup, Context.MODE_PRIVATE)
        val containerId = inputData.getString(containerIdKey) ?: throw Exception("Missing container id")
        val rawClient = prefs.getString("client", "null").toString()
        val client = Gson().fromJson(rawClient, Client::class.java) ?: throw Exception("Missing client")

        val container = getDockerContainer(containerId, client) ?: throw Exception("No container data")

        container
    }

    private fun updateWidget(context: Context, glanceId: GlanceId, container: Container) {
        PourtainerWidgetReceiver().onStatusUpdated(context = context, glanceId, container)
    }

    companion object {
        const val containerIdKey = "container_id"
        const val glanceIdKey = "glance_id"
    }
}
