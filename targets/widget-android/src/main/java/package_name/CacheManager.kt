package com.pourtainer.mobile

import Endpoint
import RawContainer
import expo.modules.widgetkit.Instance
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.Date
import safeInstanceId  // Import the extension property

/**
 * Manages caching of API responses to improve performance and reduce API calls
 * Uses a singleton pattern to provide a shared instance throughout the app
 * Cache expires after 60 seconds to ensure data is relatively fresh
 * Uses Mutex for thread safety in concurrent environments (Kotlin alternative to Swift Actor)
 */
class CacheManager private constructor() {
    // Singleton instance for global access
    companion object {
        val shared = CacheManager()
    }

    // Cache key structure to uniquely identify instance+endpoint combinations
    private data class ContainerCacheKey(
        val instanceId: String,
        val endpointId: Int
    )

    // Container cache entry that stores containers per instance+endpoint
    private data class ContainerCacheEntry(
        val containers: Array<RawContainer>,
        val timestamp: Date
    )

    // Endpoint cache entry that stores endpoints per instance
    private data class EndpointCacheEntry(
        val endpoints: Array<Endpoint>,
        val timestamp: Date
    )

    // Dictionary to store containers per instance+endpoint combination
    private val containerCacheEntries = mutableMapOf<ContainerCacheKey, ContainerCacheEntry>()

    // Dictionary to store endpoints per instance
    private val endpointCacheEntries = mutableMapOf<String, EndpointCacheEntry>()

    // Cache expiration time in seconds
    private val cacheExpirationSeconds: Int = 60

    // Mutex for thread-safety
    private val mutex = Mutex()

    /**
     * Checks if the cached endpoints are valid for a specific instance
     * Returns false if no cache exists or if cache has expired
     * 
     * @param instanceId The ID of the Pourtainer instance to check
     * @return Whether valid cached endpoints exist for the instance
     */
    private fun hasValidEndpointCache(instanceId: String): Boolean {
        val cacheEntry = endpointCacheEntries[instanceId] ?: return false
        
        val now = Date()
        return (now.time - cacheEntry.timestamp.time) / 1000 < cacheExpirationSeconds
    }

    /**
     * Checks if the cached containers are valid for a specific instance+endpoint
     * Returns false if no cache exists or if cache has expired
     * 
     * @param key The unique cache key for the instance+endpoint combination
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
     * Endpoints are cached per-instance
     * Thread-safe due to mutex locking
     *
     * @param instance The authenticated Pourtainer instance
     * @return Array of Endpoint objects representing Docker environments
     * @throws Exception if API call fails or response cannot be decoded
     */
    suspend fun fetchCachedEndpoints(instance: Instance): Array<Endpoint> {
        return mutex.withLock {
            // Return cached endpoints if available and still valid
            if (hasValidEndpointCache(instance.safeInstanceId)) {
                return@withLock endpointCacheEntries[instance.safeInstanceId]!!.endpoints
            }

            // Fetch from API if cache is invalid or expired
            val endpoints = fetchEndpoints(instance)

            // Update cache with fresh data
            endpointCacheEntries[instance.safeInstanceId] = EndpointCacheEntry(
                endpoints = endpoints,
                timestamp = Date()
            )

            endpoints
        }
    }

    /**
     * Fetches containers from cache if available, otherwise from API
     * Uses a 60-second cache to reduce API calls while keeping data fresh
     * Containers are cached per instance+endpoint combination
     * Thread-safe due to mutex locking
     *
     * @param instance The authenticated Pourtainer instance
     * @param endpoint The endpoint to fetch containers from
     * @return Array of RawContainer objects
     * @throws Exception if API call fails
     */
    suspend fun fetchCachedContainers(instance: Instance, endpoint: Endpoint): Array<RawContainer> {
        return mutex.withLock {
            // Create a unique key for this instance+endpoint combination
            val cacheKey = ContainerCacheKey(instanceId = instance.safeInstanceId, endpointId = endpoint.Id)
            
            // Return cached containers if available and still valid
            if (hasValidContainerCache(cacheKey)) {
                return@withLock containerCacheEntries[cacheKey]!!.containers
            }

            // Fetch from API if cache is invalid or expired
            val containers = fetchContainers(instance, endpoint)
    
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