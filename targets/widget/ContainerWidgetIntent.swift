import AppIntents

/**
 * Entity representing a container for widget configuration 
 * Used in the widget configuration UI to select a container
 * Implements AppEntity to integrate with the system's configuration UI
 */
struct ContainerListItem: AppEntity, Decodable {
    static var defaultQuery = ContainerQuery()
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Pick"

    var displayRepresentation: DisplayRepresentation {
        // Format subtitle with endpoint name, and stack name in parentheses if available
        let subtitle: String
        if let stackName = stackName, !stackName.isEmpty {
            subtitle = "\(endpoint.Name) (\(stackName))"
        } else {
            subtitle = endpoint.Name
        }
        
        return DisplayRepresentation(
            title: "\(containerName)",
            subtitle: "\(subtitle)"
        )
    }

    let id: String              // Container ID (used for fetching container data)
    let containerName: String   // Display name of the container
    let stackName: String?      // Stack name the container belongs to (optional)
    let connection: Connection      // Connection where the container exists
    let endpoint: Endpoint      // Endpoint where the container exists
}

/**
 * Query implementation for container selection
 * Handles fetching and filtering containers for the widget configuration UI
 * Provides the available containers for the user to select from
 */
struct ContainerQuery: EntityQuery {
    /**
     * Fetches available containers from all connections and endpoints
     * Updates the widget state based on the result
     * This is the main method called when configuring the widget
     * Enhanced with parallel fetching using task groups
     *
     * @return Array of ContainerListItem objects to display in the widget configuration
     * @throws Error if fetching fails
     */
    func getSharedOptions() async throws -> Array<ContainerListItem> {
        // Set widget state to loading while fetching data
        setWidgetState(state: .loading)

        // Retrieve stored connections from UserDefaults
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
              let rawConnections = sharedDefaults.data(forKey: connectionsKey) else {
            setWidgetState(state: .apiFailed)
            return []
        }

        // Decode the connections from JSON data
        let connections = (try? JSONDecoder().decode([Connection].self, from: rawConnections)) ?? []
        
        // No connections available
        if connections.isEmpty {
            setWidgetState(state: .apiFailed)
            return []
        }

        // Use task group to fetch containers from multiple endpoints in parallel
        do {
            let options = try await fetchContainersInParallel(connections: connections)
            
            // Update widget state based on container availability
            setWidgetState(state: options.isEmpty ? .noContainers : .hasContainers)
            
            return options
        } catch {
            // Set widget state to API failed if any request fails
            setWidgetState(state: .apiFailed)
            return []
        }
    }
    
    /**
     * Fetches containers from all connections and endpoints in parallel using task groups
     * Significantly improves performance by making concurrent API requests
     *
     * @param connections Array of authenticated Pourtainer connections
     * @return Array of ContainerListItem objects from all endpoints
     * @throws Error if any fetch operation fails
     */
    private func fetchContainersInParallel(connections: [Connection]) async throws -> [ContainerListItem] {
        return try await withThrowingTaskGroup(of: [ContainerListItem].self) { group in
            for connection in connections {
                // First get endpoints for this connection
                let endpoints = try await CacheManager.shared.fetchCachedEndpoints(connection: connection)
                
                // Then create a parallel task for each endpoint to fetch its containers
                for endpoint in endpoints {
                    group.addTask {
                        // Check for task cancellation
                        try Task.checkCancellation()
                        
                        // Get cached containers for this endpoint
                        let containers = try await CacheManager.shared.fetchCachedContainers(
                            connection: connection, 
                            endpoint: endpoint
                        )
                        
                        // Map raw containers to container list items
                        return containers.map { container in
                            var containerName = container.Names.first ?? "Unknown"
                            
                            // Clean up container name (remove leading slash if present)
                            // Docker typically adds a leading slash to container names
                            if containerName != "Unknown" && containerName.hasPrefix("/") {
                                containerName = String(containerName.dropFirst())
                            }
                            
                            // Extract stack name from container labels
                            // Check different possible label keys for stack information
                            let stackName = container.Labels?["com.docker.compose.project"] 
                                ?? container.Labels?["com.docker.stack.namespace"]
                            
                            return ContainerListItem(
                                id: container.Id,
                                containerName: containerName,
                                stackName: stackName,
                                connection: connection,
                                endpoint: endpoint
                            )
                        }
                    }
                }
            }
            
            // Collect results from all parallel tasks
            var allOptions: [ContainerListItem] = []
            for try await containerItems in group {
                allOptions.append(contentsOf: containerItems)
            }
            
            return allOptions
        }
    }

    /**
     * Returns entities matching the provided identifiers
     * Used when re-loading previously selected containers
     * 
     * @param identifiers Array of container IDs to filter by
     * @return Array of matching ContainerListItem objects
     */
    func entities(for identifiers: [ContainerListItem.ID]) async throws -> Array<ContainerListItem> {
        return try await getSharedOptions().filter { identifiers.contains($0.id) }
    }

    /**
     * Returns suggested entities for the widget configuration
     * Provides the list of containers to show in the configuration UI
     * 
     * @return Array of ContainerListItem objects for selection
     */
    func suggestedEntities() async throws -> Array<ContainerListItem> {
        return try await getSharedOptions()
    }

    /**
     * Returns the default entity to select in the widget configuration
     * If possible, provides a default container to pre-select
     * 
     * @return First available ContainerListItem or nil if none found
     */
    func defaultResult() async -> ContainerListItem? {
        return try? await suggestedEntities().first
    }

    /**
     * Updates the widget state in UserDefaults
     * Used to track the widget configuration status
     *
     * @param state The new widget state
     */
    private func setWidgetState(state: WidgetIntentState) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName) else {
            return
        }

        sharedDefaults.set(state.rawValue, forKey: widgetStateKey)
        sharedDefaults.synchronize()
    }
}
