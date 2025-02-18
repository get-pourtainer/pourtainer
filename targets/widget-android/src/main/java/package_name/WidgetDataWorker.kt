package com.pourtainer.mobile

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class WidgetDataWorker(context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {
    override suspend fun doWork(): Result {
        val glanceId = GlanceAppWidgetManager(context = applicationContext)
            .getGlanceIds(PourtainerWidget::class.java).firstOrNull()

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

    private suspend fun fetchApiData(): String = withContext(Dispatchers.IO) {
        // todo fetch container data
    }

    private fun updateWidget(context: Context, glanceId: GlanceId, data: String) {
        // todo
    }

    companion object {
        const val containerIdKey = "container_id"
    }
}
