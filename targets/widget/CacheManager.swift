import Foundation

final class CacheManager {
    static let shared = CacheManager()

    private init() {}

    private var cachedContainers: Array<RawContainer>? {
        didSet {
            lastCachedContainersDate = .now
        }
    }

    private var cachedEndpoints: Array<Endpoint>? {
        didSet {
            lastCachedEndpointsDate = .now
        }
    }

    private var lastCachedContainersDate: Date?
    private var lastCachedEndpointsDate: Date?

    private var hasCachedEndpoints: Bool {
        guard let _ = cachedEndpoints else { return false }
        guard let lastCachedEndpointsDate = lastCachedEndpointsDate else { return false }


        return Date.now.timeIntervalSince(lastCachedEndpointsDate) < 60
    }

    private var hasCachedContainers: Bool {
        guard let _ = cachedContainers else { return false }
        guard let lastCachedContainersDate = lastCachedContainersDate else { return false }

        return Date.now.timeIntervalSince(lastCachedContainersDate) < 60
    }

    func fetchCachedEndpoints(instance: Instance) async throws -> Array<Endpoint> {
        if let cachedEndpoints, hasCachedEndpoints {
            return cachedEndpoints
        }

        let endpoints = try await fetchEndpoints(instance: instance)

        self.cachedEndpoints = endpoints

        return endpoints
    }

    func fetchCachedContainers(instance: Instance, endpoint: Endpoint) async throws -> Array<RawContainer> {
        if let cachedContainers, hasCachedContainers {
            return cachedContainers
        }

        let containers = try await fetchContainers(instance: instance, endpoint: endpoint)

        self.cachedContainers = containers

        return containers
    }
}
