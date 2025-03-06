package com.pourtainer.mobile

import Container
import Endpoint
import RawContainerResponse
import RawContainerDetailsResponse
import Stack
import LogLine
import expo.modules.widgetkit.Connection
import java.nio.ByteBuffer

/**
 * Fetches available endpoints from the Pourtainer connection
 * 
 * @param connection The authenticated Pourtainer connection
 * @return Array of Endpoint objects
 */
suspend fun fetchEndpoints(connection: Connection): Array<Endpoint> {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints?excludeSnapshots=true",
        connection = connection
    )

    return httpRequestWithRetry(params)
}

/**
 * Fetches containers list from a specific endpoint
 * 
 * @param connection The authenticated Pourtainer connection
 * @param endpoint The endpoint to fetch containers from
 * @return Array of RawContainerResponse objects
 */
suspend fun fetchContainers(connection: Connection, endpoint: Endpoint): Array<RawContainerResponse> {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints/${endpoint.Id}/docker/containers/json?all=true",
        connection = connection
    )

    return httpRequestWithRetry(params)
}

/**
 * Fetches containers belonging to a specific stack
 * 
 * @param connection The authenticated Pourtainer connection
 * @param endpoint The endpoint to fetch containers from
 * @param stackName The name of the stack to filter containers by
 * @return Array of RawContainerResponse objects from the specified stack
 */
suspend fun fetchContainersForStack(connection: Connection, endpoint: Endpoint, stackName: String): Array<RawContainerResponse> {
    // Fetch all containers
    val containers = fetchContainers(connection, endpoint)
    
    // Filter containers by stack name
    return containers.filter { container ->
        val containerStackName = container.Labels?.get("com.docker.compose.project") ?: "Stackless"
        containerStackName == stackName
    }.toTypedArray()
}

/**
 * Builds a list of stacks with container counts
 * 
 * @param connection The authenticated Pourtainer connection
 * @param endpoint The endpoint to fetch containers from
 * @return Array of Stack objects with container counts
 */
suspend fun fetchStacksWithContainerCounts(connection: Connection, endpoint: Endpoint): Array<Stack> {
    // Fetch all containers
    val containers = fetchContainers(connection, endpoint)
    
    // Group containers by stack name and count them
    val stackCounts = mutableMapOf<String, Int>()
    
    for (container in containers) {
        val stackName = container.Labels?.get("com.docker.compose.project") ?: "Stackless"
        stackCounts[stackName] = (stackCounts[stackName] ?: 0) + 1
    }
    
    // Convert to array of Stack objects and sort
    return stackCounts.map { (name, count) ->
        Stack(id = name, name = name, containerCount = count)
    }.sortedWith(compareBy<Stack> { 
        if (it.name == "Stackless") 1 else 0 
    }.thenBy { 
        it.name 
    }).toTypedArray()
}

/**
 * Extracts unique stack names from containers
 * Uses the same logic as the app's container grouping
 * 
 * @param connection The authenticated Pourtainer connection
 * @param endpoint The endpoint to fetch containers from
 * @return Array of unique stack names
 */
suspend fun fetchStacks(connection: Connection, endpoint: Endpoint): Array<String> {
    // Fetch all containers
    val containers = fetchContainers(connection, endpoint)
    
    // Group containers by stack name
    val stackNames = mutableSetOf<String>()
    
    for (container in containers) {
        // Use 'com.docker.compose.project' label or default to "Stackless"
        val stackName = container.Labels?.get("com.docker.compose.project") ?: "Stackless"
        stackNames.add(stackName)
    }
    
    // Convert to array and sort alphabetically (with "Stackless" at the end)
    return stackNames.sortedWith(compareBy<String> { 
        if (it == "Stackless") 1 else 0 
    }.thenBy { 
        it 
    }).toTypedArray()
}

/**
 * Fetches detailed information about a specific container
 * 
 * @param connection The authenticated Pourtainer connection
 * @param endpoint The endpoint where the container exists
 * @param containerId The ID of the container to fetch
 * @return Container object if found
 */
/**
 * Fetches a container without the connection field, which will be added by ContainerWidgetDataWorker
 * because Container.connection is not part of the API response.
 */
suspend fun fetchContainer(connection: Connection, endpoint: Endpoint, containerId: String): Container? {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints/${endpoint.Id}/docker/containers/${containerId}/json",
        connection = connection
    )

    try {
        val response = httpRequestWithRetry<RawContainerDetailsResponse>(params)
        
        // Create a Container with the connection, endpoint and stack name added
        return Container(
            id = response.Id,
            name = response.Name,
            state = response.State.Status,
			stackName = response.Config.Labels?.get("com.docker.compose.project.name"),
            connection = connection,
			endpoint = endpoint
        )
    } catch (e: Exception) {
        return null
    }
}

/**
 * Fetches container logs from a specific container
 * Processes and returns the raw log data as a string
 * 
 * @param connection The authenticated Pourtainer connection
 * @param endpoint The endpoint where the container exists
 * @param containerId The ID of the container to fetch logs from
 * @return String containing the processed logs
 */
suspend fun fetchLogs(
    connection: Connection, 
    endpoint: Endpoint, 
    containerId: String
): String {
    // Build URL query parameters
    val queryParams = listOf(
        "follow=0",
        "stdout=1",
        "stderr=1",
        "since=${24 * 60 * 60}",
        "tail=100",
        "timestamps=0"
    ).joinToString("&")
    
    // Create params for the request
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints/${endpoint.Id}/docker/containers/${containerId}/logs?$queryParams",
        connection = connection
    )
    
    // Fetch raw binary data
    val rawData = httpRequestRawDataWithRetry(params)
    
    // Process the Docker log format
    return processDockerLogs(rawData)
}

/**
 * Processes Docker log data in the multiplexed format
 * Docker prefixes each log line with 8 bytes:
 * - First byte: stream type (stdout=1, stderr=2)
 * - Next 3 bytes: null bytes (padding)
 * - Next 4 bytes: message length as a 32-bit integer (big-endian)
 * 
 * @param data Raw binary log data
 * @return String with processed log content
 */
private fun processDockerLogs(data: ByteArray): String {
    if (data.isEmpty()) return ""
    
    val result = StringBuilder()
    var position = 0
    
    // Process each log entry
    while (position < data.size) {
        // Ensure we have enough data for the header (8 bytes)
        if (position + 8 > data.size) {
            break
        }
        
        // Skip stream type byte + 3 padding bytes
        position += 4
        
        // Read message length (4 bytes, big-endian)
        val length = ((data[position].toInt() and 0xFF) shl 24) or
                    ((data[position + 1].toInt() and 0xFF) shl 16) or
                    ((data[position + 2].toInt() and 0xFF) shl 8) or
                    (data[position + 3].toInt() and 0xFF)
        
        position += 4
        
        // Ensure we have enough data for the message
        if (position + length > data.size) {
            break
        }
        
        // Extract and append the log message
        val logMessage = String(data, position, length)
        result.append(logMessage)
        
        position += length
    }
    
    return result.toString()
}
