import Foundation

/**
 * Manages caching of API responses to improve performance and reduce API calls
 * Uses a singleton pattern to provide a shared instance throughout the app
 * Cache expires after 60 seconds to ensure data is relatively fresh
 * Implemented as an actor for thread safety in concurrent environments
 */
actor CacheManager {
    // Singleton instance for global access
    static let shared = CacheManager()

    // Private initializer to enforce singleton pattern
    private init() {}

    // Cache key structure to uniquely identify instance+endpoint combinations
    private struct ContainerCacheKey: Hashable {
        let instanceId: String
        let endpointId: Int
    }

    // Container cache dictionary that stores containers per instance+endpoint
    // Maps a unique instance+endpoint key to the corresponding container data and timestamp
    private struct ContainerCacheEntry {
        let containers: [RawContainer]
        let timestamp: Date
    }

    // Dictionary to store containers per instance+endpoint combination
    private var containerCacheEntries: [ContainerCacheKey: ContainerCacheEntry] = [:]

    // Dictionary to store endpoints per instance to avoid invalidating all endpoints
    private var endpointCacheEntries: [String: (endpoints: [Endpoint], timestamp: Date)] = [:]

    // Cache expiration time in seconds
    private let cacheExpirationSeconds: TimeInterval = 60

    /**
     * Checks if the cached endpoints are valid for a specific instance
     * Returns false if no cache exists or if cache has expired
     * 
     * @param instanceId The ID of the Pourtainer instance to check
     * @return Whether valid cached endpoints exist for the instance
     */
    private func hasValidEndpointCache(for instanceId: String) -> Bool {
        guard let cacheEntry = endpointCacheEntries[instanceId] else {
            return false
        }
        
        return Date.now.timeIntervalSince(cacheEntry.timestamp) < cacheExpirationSeconds
    }

    /**
     * Checks if the cached containers are valid for a specific instance+endpoint
     * Returns false if no cache exists or if cache has expired
     * 
     * @param key The unique cache key for the instance+endpoint combination
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
     * Endpoints are cached per-instance
     * Thread-safe due to actor isolation
     *
     * @param instance The authenticated Pourtainer instance
     * @return Array of Endpoint objects representing Docker environments
     * @throws Error if API call fails or response cannot be decoded
     */
    func fetchCachedEndpoints(instance: Instance) async throws -> Array<Endpoint> {
        // Check for task cancellation
        try Task.checkCancellation()
        
        // Return cached endpoints if available and still valid
        if hasValidEndpointCache(for: instance.instanceId) {
            return endpointCacheEntries[instance.instanceId]!.endpoints
        }

        // Fetch from API if cache is invalid or expired
        let endpoints = try await fetchEndpoints(instance: instance)

        // Update cache with fresh data
        endpointCacheEntries[instance.instanceId] = (endpoints: endpoints, timestamp: .now)

        return endpoints
    }

    /**
     * Fetches containers from cache if available, otherwise from API
     * Uses a 60-second cache to reduce API calls while keeping data fresh
     * Containers are cached per instance+endpoint combination
     * Thread-safe due to actor isolation
     *
     * @param instance The authenticated Pourtainer instance
     * @param endpoint The endpoint to fetch containers from
     * @return Array of RawContainer objects
     * @throws Error if API call fails
     */
    func fetchCachedContainers(instance: Instance, endpoint: Endpoint) async throws -> Array<RawContainer> {
        // Check for task cancellation
        try Task.checkCancellation()
        
        // Create a unique key for this instance+endpoint combination
        let cacheKey = ContainerCacheKey(instanceId: instance.instanceId, endpointId: endpoint.Id)
        
        // Return cached containers if available and still valid
        if hasValidContainerCache(for: cacheKey) {
            return containerCacheEntries[cacheKey]!.containers
        }

        // Fetch from API if cache is invalid or expired
        let containers = try await fetchContainers(
            instance: instance, 
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
