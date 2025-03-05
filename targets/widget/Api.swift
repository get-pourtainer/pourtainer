import Foundation

/**
 * Fetches available endpoints from the Pourtainer instance
 * 
 * @param instance The authenticated Pourtainer instance
 * @return Array of Endpoint objects
 */
func fetchEndpoints(instance: Instance) async throws -> Array<Endpoint> {
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints?excludeSnapshots=true",
        instance: instance
    )

    return try await httpRequestWithRetry(params: params)
}

/**
 * Fetches containers list from a specific endpoint
 * 
 * @param instance The authenticated Pourtainer instance
 * @param endpoint The endpoint to fetch containers from
 * @return Array of RawContainer objects
 */
func fetchContainers(instance: Instance, endpoint: Endpoint) async throws -> Array<RawContainer> {
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints/\(endpoint.Id)/docker/containers/json?all=true",
        instance: instance
    )

    return try await httpRequestWithRetry(params: params)
}

/**
 * Fetches containers belonging to a specific stack
 * 
 * @param instance The authenticated Pourtainer instance
 * @param endpoint The endpoint to fetch containers from
 * @param stackName The name of the stack to filter containers by
 * @return Array of RawContainer objects from the specified stack
 */
func fetchContainersForStack(instance: Instance, endpoint: Endpoint, stackName: String) async throws -> [RawContainer] {
    // Fetch all containers
    let containers = try await fetchContainers(instance: instance, endpoint: endpoint)
    
    // Filter containers by stack name
    return containers.filter { container in
        let containerStackName = container.Labels?["com.docker.compose.project"] ?? "Stackless"
        return containerStackName == stackName
    }
}

/**
 * Builds a list of stacks with container counts
 * 
 * @param instance The authenticated Pourtainer instance
 * @param endpoint The endpoint to fetch containers from
 * @return Array of Stack objects with container counts
 */
func fetchStacksWithContainerCounts(instance: Instance, endpoint: Endpoint) async throws -> [Stack] {
    // Fetch all containers
    let containers = try await fetchContainers(instance: instance, endpoint: endpoint)
    
    // Group containers by stack name and count them
    var stackCounts: [String: Int] = [:]
    
    for container in containers {
        let stackName = container.Labels?["com.docker.compose.project"] ?? "Stackless"
        stackCounts[stackName, default: 0] += 1
    }
    
    // Convert to array of Stack objects and sort
    let stacks = stackCounts.map { (name, count) in
        Stack(id: name, name: name, containerCount: count)
    }.sorted { (a, b) -> Bool in
        if a.name == "Stackless" { return false }
        if b.name == "Stackless" { return true }
        return a.name < b.name
    }
    
    return stacks
}

/**
 * Extracts unique stack names from containers
 * Uses the same logic as the app's container grouping
 * 
 * @param instance The authenticated Pourtainer instance
 * @param endpoint The endpoint to fetch containers from
 * @return Array of unique stack names
 */
func fetchStacks(instance: Instance, endpoint: Endpoint) async throws -> [String] {
    // Fetch all containers
    let containers = try await fetchContainers(instance: instance, endpoint: endpoint)
    
    // Group containers by stack name
    var stackNames = Set<String>()
    
    for container in containers {
        // Use 'com.docker.compose.project' label or default to "Stackless"
        let stackName = container.Labels?["com.docker.compose.project"] ?? "Stackless"
        stackNames.insert(stackName)
    }
    
    // Convert to array and sort alphabetically (with "Stackless" at the end)
    let sortedStacks = stackNames.sorted { (a, b) -> Bool in
        if a == "Stackless" { return false }
        if b == "Stackless" { return true }
        return a < b
    }
    
    return sortedStacks
}

/**
 * Fetches detailed information about a specific container
 * 
 * @param instance The authenticated Pourtainer instance
 * @param endpoint The endpoint where the container exists
 * @param containerId The ID of the container to fetch
 * @return Container object if found, nil otherwise
 */
func fetchContainer(instance: Instance, endpoint: Endpoint, containerId: String) async throws -> Container? {
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints/\(endpoint.Id)/docker/containers/\(containerId)/json",
        instance: instance
    )

    return try await httpRequestWithRetry(params: params)
}

/**
 * Fetches container logs from a specific container
 * Processes and returns the raw log data as a string
 * 
 * @param instance The authenticated Pourtainer instance
 * @param endpoint The endpoint where the container exists
 * @param containerId The ID of the container to fetch logs from
 * @param options Configuration for log retrieval (timestamps, tail, since)
 * @return String containing the processed logs
 */
func fetchLogs(
    instance: Instance, 
    endpoint: Endpoint, 
    containerId: String
) async throws -> String {
    // Build URL query parameters
    var urlComponents = URLComponents()
    
    // Add query parameters
    urlComponents.queryItems = [
        URLQueryItem(name: "follow", value: "0"),
        URLQueryItem(name: "stdout", value: "1"),
        URLQueryItem(name: "stderr", value: "1"),
        URLQueryItem(name: "since", value: String(24 * 60 * 60)),
        URLQueryItem(name: "tail", value: String(10)),
        URLQueryItem(name: "timestamps", value: "0")
    ]
    
    let queryString = urlComponents.percentEncodedQuery ?? ""
    
    // Create params for the request
    let params = FetchParams(
        method: HTTPMethod.GET,
        url: "/api/endpoints/\(endpoint.Id)/docker/containers/\(containerId)/logs?\(queryString)",
        instance: instance
    )
    
    // Fetch raw binary data
    let rawData = try await httpRequestRawDataWithRetry(params: params)
    
    // Process the Docker log format (similar to the TypeScript implementation)
    // Docker logs use a multiplexed format with headers
    return processDockerLogs(data: rawData)
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
private func processDockerLogs(data: Data) -> String {
    guard !data.isEmpty else { return "" }
    
    var result = ""
    var position = 0
    
    // Process each log entry
    while position < data.count {
        // Ensure we have enough data for the header (8 bytes)
        if position + 8 > data.count {
            break
        }
        
        // Skip stream type byte + 3 padding bytes
        position += 4
        
        // Read message length (4 bytes, big-endian)
        let length = (Int(data[position]) << 24) |
                     (Int(data[position + 1]) << 16) |
                     (Int(data[position + 2]) << 8) |
                     Int(data[position + 3])
        
        position += 4
        
        // Ensure we have enough data for the message
        if position + length > data.count {
            break
        }
        
        // Extract and append the log message
        if let logMessage = String(data: data.subdata(in: position..<position+length), encoding: .utf8) {
            result += logMessage
        }
        
        position += length
    }
    
    return result
}
