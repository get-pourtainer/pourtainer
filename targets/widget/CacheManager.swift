import Foundation

/**
 * Manages caching of API responses to improve performance and reduce API calls
 * Uses a singleton pattern to provide a shared connection throughout the app
 * Cache expires after 60 seconds to ensure data is relatively fresh
 * Implemented as an actor for thread safety in concurrent environments
 */
actor CacheManager {
    // Singleton connection for global access
    static let shared = CacheManager()

    // Private initializer to enforce singleton pattern
    private init() {}

    // Cache key structure to uniquely identify connection+endpoint combinations
    private struct ContainerCacheKey: Hashable {
        let connectionId: String
        let endpointId: Int
    }

    // Container cache dictionary that stores containers per connection+endpoint
    // Maps a unique connection+endpoint key to the corresponding container data and timestamp
    private struct ContainerCacheEntry {
        let containers: [RawContainer]
        let timestamp: Date
    }

    // Dictionary to store containers per connection+endpoint combination
    private var containerCacheEntries: [ContainerCacheKey: ContainerCacheEntry] = [:]

    // Dictionary to store endpoints per connection to avoid invalidating all endpoints
    private var endpointCacheEntries: [String: (endpoints: [Endpoint], timestamp: Date)] = [:]

    // Cache expiration time in seconds
    private let cacheExpirationSeconds: TimeInterval = 60

    /**
     * Checks if the cached endpoints are valid for a specific connection
     * Returns false if no cache exists or if cache has expired
     * 
     * @param connectionId The ID of the Pourtainer connection to check
     * @return Whether valid cached endpoints exist for the connection
     */
    private func hasValidEndpointCache(for connectionId: String) -> Bool {
        guard let cacheEntry = endpointCacheEntries[connectionId] else {
            return false
        }
        
        return Date.now.timeIntervalSince(cacheEntry.timestamp) < cacheExpirationSeconds
    }

    /**
     * Checks if the cached containers are valid for a specific connection+endpoint
     * Returns false if no cache exists or if cache has expired
     * 
     * @param key The unique cache key for the connection+endpoint combination
     * @return Whether valid cached containers exist for the key
     */
    private func hasValidContainerCache(for key: ContainerCacheKey) -> Bool {
        guard let cacheEntry = containerCacheEntries[key] else {
            return false
        }
        
        return Date.now.timeIntervalSince(cacheEntry.timestamp) < cacheExpirationSeconds
    }

    /**
     * Fetches endpoints from cache if available, otherwise from API
     * Uses a 60-second cache to reduce API calls while keeping data fresh
     * Endpoints are cached per-connection
     * Thread-safe due to actor isolation
     *
     * @param connection The authenticated Pourtainer connection
     * @return Array of Endpoint objects representing Docker environments
     * @throws Error if API call fails or response cannot be decoded
     */
    func fetchCachedEndpoints(connection: Connection) async throws -> Array<Endpoint> {
        // Check for task cancellation
        try Task.checkCancellation()
        
        // Return cached endpoints if available and still valid
        if hasValidEndpointCache(for: connection.id) {
            return endpointCacheEntries[connection.id]!.endpoints
        }

        // Fetch from API if cache is invalid or expired
        let endpoints = try await fetchEndpoints(connection: connection)

        // Update cache with fresh data
        endpointCacheEntries[connection.id] = (endpoints: endpoints, timestamp: .now)

        return endpoints
    }

    /**
     * Fetches containers from cache if available, otherwise from API
     * Uses a 60-second cache to reduce API calls while keeping data fresh
     * Containers are cached per connection+endpoint combination
     * Thread-safe due to actor isolation
     *
     * @param connection The authenticated Pourtainer connection
     * @param endpoint The endpoint to fetch containers from
     * @return Array of RawContainer objects
     * @throws Error if API call fails
     */
    func fetchCachedContainers(connection: Connection, endpoint: Endpoint) async throws -> Array<RawContainer> {
        // Check for task cancellation
        try Task.checkCancellation()
        
        // Create a unique key for this connection+endpoint combination
        let cacheKey = ContainerCacheKey(connectionId: connection.id, endpointId: endpoint.Id)
        
        // Return cached containers if available and still valid
        if hasValidContainerCache(for: cacheKey) {
            return containerCacheEntries[cacheKey]!.containers
        }

        // Fetch from API if cache is invalid or expired
        let containers = try await fetchContainers(
            connection: connection, 
            endpoint: endpoint
        )
 
        // Update cache with fresh data
        containerCacheEntries[cacheKey] = ContainerCacheEntry(
            containers: containers,
            timestamp: .now
        )

        return containers
    }
    
    /**
     * Clears all caches
     * Useful when logging out or when cache needs to be reset
     * Thread-safe due to actor isolation
     */
    func clearCache() {
        containerCacheEntries.removeAll()
        endpointCacheEntries.removeAll()
    }
}
