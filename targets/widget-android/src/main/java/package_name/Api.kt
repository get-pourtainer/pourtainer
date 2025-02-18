package com.pourtainer.mobile

import expo.modules.widgetkit.Client

suspend fun getDockerContainer(id: String, client: Client): Container? {
    val params = FetchParams(method = HTTPMethod.GET, url = "/containers/$id/json")

    return httpRequest(params, client)
}
