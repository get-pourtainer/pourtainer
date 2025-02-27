func fetchEndpoints(instance: Instance) async throws -> Array<Endpoint> {
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints?excludeSnapshots=true",
        instance: instance
    )

    return try await httpRequest(params: params)
}

func fetchContainers(instance: Instance, endpoint: Endpoint) async throws -> Array<RawContainer> {
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints/\(endpoint.Id)/docker/containers/json?all=true",
        instance: instance
    )

    return try await httpRequest(params: params)
}

func fetchContainer(instance: Instance, endpoint: Endpoint, containerId: String) async throws -> Container? {
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints/\(endpoint.Id)/docker/containers/\(containerId)/json",
        instance: instance
    )

    return try await httpRequest(params: params)
}
