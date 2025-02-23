package com.pourtainer.mobile

import Container
import Endpoint
import RawContainer
import expo.modules.widgetkit.Instance

suspend fun fetchEndpoints(instance: Instance): Array<Endpoint> {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints?excludeSnapshots=true",
        instance = instance
    )

    return httpRequest(params)
}

suspend fun fetchContainers(instance: Instance, endpoint: Endpoint): Array<RawContainer> {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints/${endpoint.Id}/docker/containers/json?all=true",
        instance = instance
    )

    return httpRequest(params)
}

suspend fun fetchContainer(instance: Instance, endpoint: Endpoint, containerId: String): Container? {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/api/endpoints/${endpoint.Id}/docker/containers/${containerId}/json",
        instance = instance
    )

    return httpRequest(params)
}
