package com.pourtainer.mobile

import Endpoint
import RawContainerResponse
import expo.modules.widgetkit.Connection
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.Date
import safeConnectionId  // Import the extension property

/**
 * Manages caching of API responses to improve performance and reduce API calls
 * Uses a singleton pattern to provide a shared connection throughout the app
 * Cache expires after 60 seconds to ensure data is relatively fresh
 * Uses Mutex for thread safety in concurrent environments (Kotlin alternative to Swift Actor)
 */
class CacheManager private constructor() {
    // Singleton connection for global access
    companion object {
        val shared = CacheManager()
    }

    // Cache key structure to uniquely identify connection+endpoint combinations
    private data class ContainerCacheKey(
        val connectionId: String,
        val endpointId: Int
    )

    // Container cache entry that stores containers per connection+endpoint
    private data class ContainerCacheEntry(
        val containers: Array<RawContainerResponse>,
        val timestamp: Date
    )

    // Endpoint cache entry that stores endpoints per connection
    private data class EndpointCacheEntry(
        val endpoints: Array<Endpoint>,
        val timestamp: Date
    )

    // Dictionary to store containers per connection+endpoint combination
    private val containerCacheEntries = mutableMapOf<ContainerCacheKey, ContainerCacheEntry>()

    // Dictionary to store endpoints per connection
    private val endpointCacheEntries = mutableMapOf<String, EndpointCacheEntry>()

    // Cache expiration time in seconds
    private val cacheExpirationSeconds: Int = 60

    // Mutex for thread-safety
    private val mutex = Mutex()

    /**
     * Checks if the cached endpoints are valid for a specific connection
     * Returns false if no cache exists or if cache has expired
     * 
     * @param connectionId The ID of the Pourtainer connection to check
     * @return Whether valid cached endpoints exist for the connection
     */
    private fun hasValidEndpointCache(connectionId: String): Boolean {
        val cacheEntry = endpointCacheEntries[connectionId] ?: return false
        
        val now = Date()
        return (now.time - cacheEntry.timestamp.time) / 1000 < cacheExpirationSeconds
    }

    /**
     * Checks if the cached containers are valid for a specific connection+endpoint
     * Returns false if no cache exists or if cache has expired
     * 
     * @param key The unique cache key for the connection+endpoint combination
     * @return Whether valid cached containers exist for the key
     */
    private fun hasValidContainerCache(key: ContainerCacheKey): Boolean {
        val cacheEntry = containerCacheEntries[key] ?: return false
        
        val now = Date()
        return (now.time - cacheEntry.timestamp.time) / 1000 < cacheExpirationSeconds
    }

    /**
     * Fetches endpoints from cache if available, otherwise from API
     * Uses a 60-second cache to reduce API calls while keeping data fresh
     * Endpoints are cached per-connection
     * Thread-safe due to mutex locking
     *
     * @param connection The authenticated Pourtainer connection
     * @return Array of Endpoint objects representing Docker environments
     * @throws Exception if API call fails or response cannot be decoded
     */
    suspend fun fetchCachedEndpoints(connection: Connection): Array<Endpoint> {
        return mutex.withLock {
            // Return cached endpoints if available and still valid
            if (hasValidEndpointCache(connection.safeConnectionId)) {
                return@withLock endpointCacheEntries[connection.safeConnectionId]!!.endpoints
            }

            // Fetch from API if cache is invalid or expired
            val endpoints = fetchEndpoints(connection)

            // Update cache with fresh data
            endpointCacheEntries[connection.safeConnectionId] = EndpointCacheEntry(
                endpoints = endpoints,
                timestamp = Date()
            )

            endpoints
        }
    }

    /**
     * Fetches containers from cache if available, otherwise from API
     * Uses a 60-second cache to reduce API calls while keeping data fresh
     * Containers are cached per connection+endpoint combination
     * Thread-safe due to mutex locking
     *
     * @param connection The authenticated Pourtainer connection
     * @param endpoint The endpoint to fetch containers from
     * @return Array of RawContainerResponse objects
     * @throws Exception if API call fails
     */
    suspend fun fetchCachedContainers(connection: Connection, endpoint: Endpoint): Array<RawContainerResponse> {
        return mutex.withLock {
            // Create a unique key for this connection+endpoint combination
            val cacheKey = ContainerCacheKey(connectionId = connection.safeConnectionId, endpointId = endpoint.Id)
            
            // Return cached containers if available and still valid
            if (hasValidContainerCache(cacheKey)) {
                return@withLock containerCacheEntries[cacheKey]!!.containers
            }

            // Fetch from API if cache is invalid or expired
            val containers = fetchContainers(connection, endpoint)
    
            // Update cache with fresh data
            containerCacheEntries[cacheKey] = ContainerCacheEntry(
                containers = containers,
                timestamp = Date()
            )

            containers
        }
    }
    
    /**
     * Clears all caches
     * Useful when logging out or when cache needs to be reset
     * Thread-safe due to mutex locking
     */
    suspend fun clearCache() {
        mutex.withLock {
            containerCacheEntries.clear()
            endpointCacheEntries.clear()
        }
    }
} 