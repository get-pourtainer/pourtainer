import AppIntents

/**
 * Entity representing a container for widget configuration.
 * The id is a composite of connection, endpoint and container id so a placed
 * widget can be rehydrated without network access.
 */
struct ContainerListItem: AppEntity {
    static var defaultQuery = ContainerQuery()
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Pick"

    var displayRepresentation: DisplayRepresentation {
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

    let id: String              // EntityIdentifier.rawValue
    let containerId: String     // Docker container id
    let containerName: String
    let stackName: String?
    let connection: Connection
    let endpoint: Endpoint
}

private func cleanContainerName(_ raw: String?) -> String {
    guard let raw = raw, !raw.isEmpty else { return "Unknown" }
    return raw.hasPrefix("/") ? String(raw.dropFirst()) : raw
}

/**
 * Query implementation for container selection.
 */
struct ContainerQuery: EntityQuery {
    /**
     * Lists containers from every reachable endpoint of every connection.
     * One unreachable server or endpoint must not hide the others.
     */
    func getSharedOptions() async -> [ContainerListItem] {
        let connections = loadConnections()
        if connections.isEmpty {
            return []
        }

        let options = await withTaskGroup(of: [ContainerListItem].self) { group in
            for connection in connections {
                group.addTask {
                    await containersForConnection(connection)
                }
            }

            var all: [ContainerListItem] = []
            for await items in group {
                all.append(contentsOf: items)
            }
            return all
        }

        // Remembered once per run so entities(for:) can resolve a pick offline
        WidgetCache.storeEntities(
            Dictionary(
                options.map {
                    ($0.id, EntitySnapshot(name: $0.containerName, stackName: $0.stackName, endpointName: $0.endpoint.Name))
                },
                uniquingKeysWith: { _, new in new }
            ),
            kind: .container
        )

        return options.sorted {
            $0.containerName.localizedCaseInsensitiveCompare($1.containerName) == .orderedAscending
        }
    }

    private func containersForConnection(_ connection: Connection) async -> [ContainerListItem] {
        guard let endpoints = try? await CacheManager.shared.fetchCachedEndpoints(connection: connection) else {
            return []
        }

        return await withTaskGroup(of: [ContainerListItem].self) { group in
            for endpoint in endpoints {
                group.addTask {
                    guard let containers = try? await CacheManager.shared.fetchCachedContainers(
                        connection: connection,
                        endpoint: endpoint
                    ) else {
                        return []
                    }

                    return containers.map { container in
                        ContainerListItem(
                            id: EntityIdentifier(
                                connectionId: connection.id,
                                endpointId: endpoint.Id,
                                itemId: container.Id
                            ).rawValue,
                            containerId: container.Id,
                            containerName: cleanContainerName(container.Names.first),
                            stackName: stackName(from: container.Labels),
                            connection: connection,
                            endpoint: endpoint
                        )
                    }
                }
            }

            var all: [ContainerListItem] = []
            for await items in group {
                all.append(contentsOf: items)
            }
            return all
        }
    }

    /**
     * Rehydrates previously selected containers from the composite id and the
     * snapshot cache. Never touches the network, so a placed widget keeps its
     * configuration while the server is unreachable.
     */
    func entities(for identifiers: [ContainerListItem.ID]) async throws -> [ContainerListItem] {
        let connections = loadConnections()
        let snapshots = WidgetCache.loadEntities(.container)

        return identifiers.compactMap { rawId in
            guard let parsed = EntityIdentifier(rawValue: rawId),
                  let connection = connections.first(where: { $0.id == parsed.connectionId }) else {
                return nil
            }

            let snapshot = snapshots[rawId]

            return ContainerListItem(
                id: rawId,
                containerId: parsed.itemId,
                containerName: snapshot?.name ?? "Container",
                stackName: snapshot?.stackName,
                connection: connection,
                endpoint: Endpoint(Id: parsed.endpointId, Name: snapshot?.endpointName ?? "Endpoint \(parsed.endpointId)")
            )
        }
    }

    func suggestedEntities() async throws -> [ContainerListItem] {
        await getSharedOptions()
    }

    func defaultResult() async -> ContainerListItem? {
        await getSharedOptions().first
    }
}
