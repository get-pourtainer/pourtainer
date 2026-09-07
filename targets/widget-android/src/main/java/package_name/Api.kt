package com.pourtainer.mobile

import Container
import Endpoint
import RawContainerResponse
import RawContainerDetailsResponse
import Stack
import expo.modules.widgetkit.Connection
import stackNameFrom

suspend fun fetchEndpoints(connection: Connection): Array<Endpoint> {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints?excludeSnapshots=true",
        connection = connection
    )

    return httpRequestWithRetry(params)
}

suspend fun fetchContainers(connection: Connection, endpoint: Endpoint): Array<RawContainerResponse> {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints/${endpoint.Id}/docker/containers/json?all=true",
        connection = connection
    )

    return httpRequestWithRetry(params)
}

suspend fun fetchContainersForStack(connection: Connection, endpoint: Endpoint, stackName: String): Array<RawContainerResponse> {
    val containers = fetchContainers(connection, endpoint)

    return containers.filter { container ->
        (stackNameFrom(container.Labels) ?: "Stackless") == stackName
    }.toTypedArray()
}

suspend fun fetchStacksWithContainerCounts(connection: Connection, endpoint: Endpoint): Array<Stack> {
    val containers = fetchContainers(connection, endpoint)
    val stackCounts = mutableMapOf<String, Int>()

    for (container in containers) {
        val stackName = stackNameFrom(container.Labels) ?: "Stackless"
        stackCounts[stackName] = (stackCounts[stackName] ?: 0) + 1
    }

    return stackCounts.map { (name, count) ->
        Stack(id = name, name = name, containerCount = count)
    }.sortedWith(compareBy<Stack> { if (it.name == "Stackless") 1 else 0 }.thenBy { it.name }).toTypedArray()
}

suspend fun fetchStacks(connection: Connection, endpoint: Endpoint): Array<String> {
    val containers = fetchContainers(connection, endpoint)
    val stackNames = mutableSetOf<String>()

    for (container in containers) {
        stackNames.add(stackNameFrom(container.Labels) ?: "Stackless")
    }

    return stackNames.sortedWith(compareBy<String> { if (it == "Stackless") 1 else 0 }.thenBy { it }).toTypedArray()
}

/**
 * Inspects one container. Throws HttpException (404 when it no longer exists)
 * or a network error, so callers can tell "gone" from "unreachable".
 */
suspend fun fetchContainer(connection: Connection, endpoint: Endpoint, containerId: String): Container {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints/${endpoint.Id}/docker/containers/${containerId}/json",
        connection = connection
    )

    val response = httpRequestWithRetry<RawContainerDetailsResponse>(params)

    return Container(
        id = response.Id,
        name = response.Name.removePrefix("/"),
        state = response.State.Status,
        stackName = stackNameFrom(response.Config.Labels),
        connection = connection,
        endpoint = endpoint
    )
}

suspend fun fetchLogs(
    connection: Connection,
    endpoint: Endpoint,
    containerId: String
): String {
    // Docker's `since` is an absolute UNIX timestamp
    val since = System.currentTimeMillis() / 1000 - 24 * 60 * 60
    val queryParams = listOf(
        "follow=0",
        "stdout=1",
        "stderr=1",
        "since=$since",
        "tail=100",
        "timestamps=0"
    ).joinToString("&")

    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints/${endpoint.Id}/docker/containers/${containerId}/logs?$queryParams",
        connection = connection
    )

    return processDockerLogs(httpRequestRawDataWithRetry(params))
}

private fun isFrameHeader(data: ByteArray, position: Int): Boolean {
    if (position + 8 > data.size) return false
    val streamType = data[position].toInt()
    return (streamType == 0 || streamType == 1 || streamType == 2) &&
        data[position + 1].toInt() == 0 &&
        data[position + 2].toInt() == 0 &&
        data[position + 3].toInt() == 0
}

private fun normaliseLineEndings(text: String): String =
    text.replace("\r\n", "\n").replace("\r", "\n")

/**
 * Non-TTY containers return Docker's multiplexed stream (8-byte frame headers);
 * TTY containers return raw bytes. Detected from the first frame header.
 */
fun processDockerLogs(data: ByteArray): String {
    if (data.isEmpty()) return ""
    if (!isFrameHeader(data, 0)) return normaliseLineEndings(String(data, Charsets.UTF_8))

    val result = StringBuilder()
    var position = 0

    while (position < data.size) {
        if (!isFrameHeader(data, position)) {
            result.append(String(data, position, data.size - position, Charsets.UTF_8))
            break
        }

        val length = ((data[position + 4].toInt() and 0xFF) shl 24) or
            ((data[position + 5].toInt() and 0xFF) shl 16) or
            ((data[position + 6].toInt() and 0xFF) shl 8) or
            (data[position + 7].toInt() and 0xFF)
        position += 8

        if (length < 0) break
        val end = minOf(position + length, data.size)
        result.append(String(data, position, end - position, Charsets.UTF_8))
        position = end
    }

    return normaliseLineEndings(result.toString())
}
