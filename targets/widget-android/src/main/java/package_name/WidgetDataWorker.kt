package com.pourtainer.mobile

import Container
import ContainerListItem
import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
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
        val rawContainer = inputData.getString(containerKey) ?: "null"
        val selectedContainer = Gson().fromJson(rawContainer, ContainerListItem::class.java) ?: throw Exception("Missing selected container")

        val container = fetchContainer(
            selectedContainer.instance,
            selectedContainer.endpoint,
            selectedContainer.id
        ) ?: throw Exception("No container data")

        container
    }

    private fun updateWidget(context: Context, glanceId: GlanceId, container: Container) {
        PourtainerWidgetReceiver().onStatusUpdated(context = context, glanceId, container)
    }

    companion object {
        const val containerKey = "container"
        const val glanceIdKey = "glance_id"
    }
}
