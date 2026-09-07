import Foundation

func fetchEndpoints(connection: Connection) async throws -> Array<Endpoint> {
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints?excludeSnapshots=true",
        connection: connection
    )

    return try await httpRequestWithRetry(params: params)
}

func fetchContainers(connection: Connection, endpoint: Endpoint) async throws -> Array<RawContainer> {
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints/\(endpoint.Id)/docker/containers/json?all=true",
        connection: connection
    )

    return try await httpRequestWithRetry(params: params)
}

func fetchContainersForStack(connection: Connection, endpoint: Endpoint, stackName name: String) async throws -> [RawContainer] {
    let containers = try await fetchContainers(connection: connection, endpoint: endpoint)

    return containers.filter { container in
        (stackName(from: container.Labels) ?? "Stackless") == name
    }
}

func fetchStacksWithContainerCounts(connection: Connection, endpoint: Endpoint) async throws -> [Stack] {
    let containers = try await fetchContainers(connection: connection, endpoint: endpoint)
    var stackCounts: [String: Int] = [:]

    for container in containers {
        stackCounts[stackName(from: container.Labels) ?? "Stackless", default: 0] += 1
    }

    return stackCounts.map { (name, count) in
        Stack(id: name, name: name, containerCount: count)
    }.sorted { (a, b) -> Bool in
        if a.name == "Stackless" { return false }
        if b.name == "Stackless" { return true }
        return a.name < b.name
    }
}

func fetchStacks(connection: Connection, endpoint: Endpoint) async throws -> [String] {
    let containers = try await fetchContainers(connection: connection, endpoint: endpoint)
    var stackNames = Set<String>()

    for container in containers {
        stackNames.insert(stackName(from: container.Labels) ?? "Stackless")
    }

    return stackNames.sorted { (a, b) -> Bool in
        if a == "Stackless" { return false }
        if b == "Stackless" { return true }
        return a < b
    }
}

/**
 * Inspects one container. Throws HTTPError (404 when it no longer exists) or a
 * network error, so callers can tell "gone" from "unreachable".
 */
func fetchContainer(connection: Connection, endpoint: Endpoint, containerId: String) async throws -> Container {
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints/\(endpoint.Id)/docker/containers/\(containerId)/json",
        connection: connection
    )

    return try await httpRequestWithRetry(params: params)
}

func fetchLogs(
    connection: Connection,
    endpoint: Endpoint,
    containerId: String
) async throws -> String {
    // Docker's `since` is an absolute UNIX timestamp
    let since = Int(Date().timeIntervalSince1970) - 24 * 60 * 60

    var urlComponents = URLComponents()
    urlComponents.queryItems = [
        URLQueryItem(name: "follow", value: "0"),
        URLQueryItem(name: "stdout", value: "1"),
        URLQueryItem(name: "stderr", value: "1"),
        URLQueryItem(name: "since", value: String(since)),
        URLQueryItem(name: "tail", value: String(10)),
        URLQueryItem(name: "timestamps", value: "0")
    ]

    let queryString = urlComponents.percentEncodedQuery ?? ""

    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints/\(endpoint.Id)/docker/containers/\(containerId)/logs?\(queryString)",
        connection: connection
    )

    let rawData = try await httpRequestRawDataWithRetry(params: params)

    return processDockerLogs(data: rawData)
}

private func isFrameHeader(_ data: Data, at position: Int) -> Bool {
    guard position + 8 <= data.count else { return false }
    let streamType = data[position]
    return (streamType == 0 || streamType == 1 || streamType == 2)
        && data[position + 1] == 0
        && data[position + 2] == 0
        && data[position + 3] == 0
}

private func normaliseLineEndings(_ text: String) -> String {
    text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
}

/**
 * Non-TTY containers return Docker's multiplexed stream (8-byte frame headers:
 * stream type, three zero bytes, big-endian length); TTY containers return raw
 * bytes. Detected from the first frame header.
 */
func processDockerLogs(data: Data) -> String {
    guard !data.isEmpty else { return "" }

    guard isFrameHeader(data, at: 0) else {
        return normaliseLineEndings(String(decoding: data, as: UTF8.self))
    }

    var result = ""
    var position = 0

    while position < data.count {
        guard isFrameHeader(data, at: position) else {
            result += String(decoding: data.subdata(in: position..<data.count), as: UTF8.self)
            break
        }

        let length = (Int(data[position + 4]) << 24)
            | (Int(data[position + 5]) << 16)
            | (Int(data[position + 6]) << 8)
            | Int(data[position + 7])
        position += 8

        let end = min(position + length, data.count)
        result += String(decoding: data.subdata(in: position..<end), as: UTF8.self)
        position = end
    }

    return normaliseLineEndings(result)
}
