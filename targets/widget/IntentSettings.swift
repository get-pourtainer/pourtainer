import AppIntents

struct ContainerListItem: AppEntity, Decodable {
    static var defaultQuery = ContainerQuery()
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Select Container"

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(containerName)")
    }

    let id: String
    let containerName: String
    let instance: Instance
    let endpoint: Endpoint
}

struct ContainerQuery: EntityQuery {
    func getSharedOptions() async throws -> Array<ContainerListItem> {
        var options: [ContainerListItem] = []

        setWidgetState(state: .loading)

        guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
              let rawInstances = sharedDefaults.data(forKey: instancesKey) else {
            setWidgetState(state: .apiFailed)
          
            return options
        }

        let instances = (try? JSONDecoder().decode([Instance].self, from: rawInstances)) ?? []

        for instance in instances {
            do {
                let endpoints = try await CacheManager.shared.fetchCachedEndpoints(instance: instance)

                for endpoint in endpoints {
                    let containers = try await CacheManager.shared.fetchCachedContainers(instance: instance, endpoint: endpoint)

                    options.append(contentsOf: containers.map { container in
                        ContainerListItem(
                            id: container.Id,
                            containerName: container.Names.first ?? "Unknown",
                            instance: instance,
                            endpoint: endpoint
                        )
                    })
                }

            } catch {
                setWidgetState(state: .apiFailed)
              
                return options
            }
        }

        setWidgetState(state: options.isEmpty ? .noContainers : .hasContainers)

        return options
    }

    func entities(for identifiers: [ContainerListItem.ID]) async throws -> Array<ContainerListItem> {
        return try await getSharedOptions().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> Array<ContainerListItem> {
        return try await getSharedOptions()
    }

    func defaultResult() async -> ContainerListItem? {
        return try? await suggestedEntities().first
    }

    private func setWidgetState(state: WidgetIntentState) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName) else {
            return
        }

        sharedDefaults.set(state.rawValue, forKey: widgetStateKey)
        sharedDefaults.synchronize()
    }
}
