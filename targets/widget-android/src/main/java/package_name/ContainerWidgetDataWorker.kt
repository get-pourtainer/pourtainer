package com.pourtainer.mobile

import Container
import LogLine
import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ContainerWidgetDataWorker(context: Context, workerParams: WorkerParameters): CoroutineWorker(context, workerParams) {
    override suspend fun doWork(): Result {
        val boxedGlanceId = inputData.getString(glanceIdKey) ?: throw Exception("Missing glance id")
        val glanceId = GlanceAppWidgetManager(context = applicationContext)
            .getGlanceIds(ContainerWidget::class.java).firstOrNull { id -> id.hashCode() == boxedGlanceId.toInt()}

        if (glanceId == null) {
            return Result.failure()
        }

        return try {
            // // Fetch container data
            // val containerData = fetchContainerData()
            // val container = containerData.first
			val rawContainer = inputData.getString(containerKey) ?: "null"
        	val container = Gson().fromJson(rawContainer, Container::class.java) 
            	?: throw Exception("Missing selected container")

            
            // Fetch logs if container is available
            val logs = if (container != null) {
                try {
                    fetchContainerLogs(container)
                } catch (e: Exception) {
                    emptyList<LogLine>()
                }
            } else {
                emptyList()
            }
            
            // Update widget with container and logs
            updateWidget(applicationContext, glanceId, container, logs)
            Result.success()
        } catch (e: Exception) {
            this.onFetchError(applicationContext, glanceId)
            Result.retry()
        }
    }

    /**
     * Fetches container data from the API
     * 
     * @return Pair of Container and Container, where Container might be null if fetch fails
     * @throws Exception if selected container info is missing
     */
    // private suspend fun fetchContainerData(): Pair<Container?, Container> = withContext(Dispatchers.IO) {
    //     val rawContainer = inputData.getString(containerKey) ?: "null"
    //     val selectedContainer = Gson().fromJson(rawContainer, Container::class.java) 
    //         ?: throw Exception("Missing selected container")

    //     try {
    //         val container = fetchContainer(
    //             selectedContainer.connection,
    //             selectedContainer.endpoint,
    //             selectedContainer.Id
    //         )
            
    //         val cleanedContainer = if (container != null) {
    //             // Clean Name if it starts with '/'
    //             val cleanedName = if (container.Name.startsWith("/")) {
    //                 container.Name.substring(1)
    //             } else {
    //                 container.Name
    //             }
	
    //             if (cleanedName != container.Name) {
    //                 Container(
    //                     Id = container.Id,
    //                     Name = cleanedName,
    //                     State = container.State,
	// 					stackName = container.stackName,
    //                     connection = container.connection,
    //                     endpoint = container.endpoint
    //                 )
    //             } else {
    //                 container
    //             }
    //         } else {
    //             container
    //         }
            
    //         Pair(cleanedContainer, selectedContainer)
    //     } catch (e: Exception) {
    //         Pair(null, selectedContainer)
    //     }
    // }
    
    /**
     * Fetches container logs from the API
     * 
     * @param containerItem The container item containing connection and endpoint info
     * @return List of LogLine objects containing the container logs
     */
    private suspend fun fetchContainerLogs(containerItem: Container): List<LogLine> = withContext(Dispatchers.IO) {
        try {
            val logs = fetchLogs(
                containerItem.connection,
                containerItem.endpoint,
                containerItem.id
            )
            
            if (logs.isEmpty()) {
                return@withContext emptyList<LogLine>()
            }
            
            // Split logs into lines, filter empty ones
            val rawLines = logs.split("\n").filter { it.isNotEmpty() }
            
            // Limit to most recent 20 lines
            val limitedLines = if (rawLines.size > 20) rawLines.takeLast(20) else rawLines
            
            // Process and create LogLine objects
            limitedLines.map { line ->
                val processedLine = if (line.length > 150) {
                    line.substring(0, 150) + "..."
                } else {
                    line
                }
                LogLine(content = processedLine)
            }
        } catch (e: Exception) {
            emptyList<LogLine>()
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
    private fun updateWidget(context: Context, glanceId: GlanceId, container: Container?, logs: List<LogLine>) {
        ContainerWidgetReceiver().onStatusUpdated(context, glanceId, container, logs)
    }

    private fun onFetchError(context: Context, glanceId: GlanceId) {
        ContainerWidgetReceiver().onFetchError(context, glanceId)
    }

    companion object {
        const val containerKey = "container"
        const val glanceIdKey = "glance_id"
    }
}
