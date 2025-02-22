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

        setHasContainers(false)

        guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
              let rawInstances = sharedDefaults.data(forKey: instancesKey) else {
            return options
        }

        let instances = (try? JSONDecoder().decode([Instance].self, from: rawInstances)) ?? []

        for instance in instances {
            do {
                let endpoints = try await fetchEndpoints(instance: instance)

                for endpoint in endpoints {
                    let containers = try await fetchContainers(instance: instance, endpoint: endpoint)

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
                return options
            }
        }

        setHasContainers(!options.isEmpty)

        return options
    }

    func entities(for identifiers: [ContainerListItem.ID]) async throws -> Array<ContainerListItem> {
        return try await getSharedOptions().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> Array<ContainerListItem> {
        if (!hasInstances()) {
            return []
        }

        return try await getSharedOptions()
    }

    func defaultResult() async -> ContainerListItem? {
        return try? await suggestedEntities().first
    }

    private func setHasContainers(_ hasContainers: Bool) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName) else {
            return
        }

        sharedDefaults.set(hasContainers, forKey: hasContainersKey)
        sharedDefaults.synchronize()
    }

    private func hasInstances() -> Bool {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName) else {
            return false
        }

        return sharedDefaults.bool(forKey: hasContainersKey)
    }
}
