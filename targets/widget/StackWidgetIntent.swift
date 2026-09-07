import AppIntents
import SwiftUI
import WidgetKit

/**
 * Represents a stack entity for selection in widget configuration.
 * The id is a composite of connection, endpoint and stack name.
 */
struct StackEntity: AppEntity {
    var id: String
    var name: String
    var containerCount: Int
    var connection: Connection
    var endpoint: Endpoint

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Stack"
    static var defaultQuery = StackQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(name)",
            subtitle: "\(endpoint.Name) (\(containerCount) containers)"
        )
    }
}

/**
 * Query to provide stack entities for selection, from every reachable endpoint
 * of every connection. Stacks with a single container and "Stackless" are skipped.
 */
struct StackQuery: EntityQuery {
    func getSharedOptions() async -> [StackEntity] {
        let connections = loadConnections()
        if connections.isEmpty {
            return []
        }

        let options = await withTaskGroup(of: [StackEntity].self) { group in
            for connection in connections {
                group.addTask {
                    await stacksForConnection(connection)
                }
            }

            var all: [StackEntity] = []
            for await items in group {
                all.append(contentsOf: items)
            }
            return all
        }

        // Remembered once per run so entities(for:) can resolve a pick offline
        WidgetCache.storeEntities(
            Dictionary(
                options.map {
                    ($0.id, EntitySnapshot(name: $0.name, stackName: nil, endpointName: $0.endpoint.Name, containerCount: $0.containerCount))
                },
                uniquingKeysWith: { _, new in new }
            ),
            kind: .stack
        )

        return options.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    private func stacksForConnection(_ connection: Connection) async -> [StackEntity] {
        guard let endpoints = try? await CacheManager.shared.fetchCachedEndpoints(connection: connection) else {
            return []
        }

        return await withTaskGroup(of: [StackEntity].self) { group in
            for endpoint in endpoints {
                group.addTask {
                    guard let stacks = try? await fetchStacksWithContainerCounts(connection: connection, endpoint: endpoint) else {
                        return []
                    }

                    return stacks
                        .filter { $0.containerCount > 1 && $0.name != "Stackless" }
                        .map { stack in
                            StackEntity(
                                id: EntityIdentifier(
                                    connectionId: connection.id,
                                    endpointId: endpoint.Id,
                                    itemId: stack.name
                                ).rawValue,
                                name: stack.name,
                                containerCount: stack.containerCount,
                                connection: connection,
                                endpoint: endpoint
                            )
                        }
                }
            }

            var all: [StackEntity] = []
            for await items in group {
                all.append(contentsOf: items)
            }
            return all
        }
    }

    /// Rehydrates a placed widget's stack without network access.
    func entities(for identifiers: [String]) async throws -> [StackEntity] {
        let connections = loadConnections()
        let snapshots = WidgetCache.loadEntities(.stack)

        return identifiers.compactMap { rawId in
            guard let parsed = EntityIdentifier(rawValue: rawId),
                  let connection = connections.first(where: { $0.id == parsed.connectionId }) else {
                return nil
            }

            let snapshot = snapshots[rawId]

            return StackEntity(
                id: rawId,
                name: parsed.itemId,
                containerCount: snapshot?.containerCount ?? 0,
                connection: connection,
                endpoint: Endpoint(Id: parsed.endpointId, Name: snapshot?.endpointName ?? "Endpoint \(parsed.endpointId)")
            )
        }
    }

    func suggestedEntities() async throws -> [StackEntity] {
        await getSharedOptions()
    }

    func defaultResult() async -> StackEntity? {
        await getSharedOptions().first
    }
}

/**
 * Widget configuration intent for selecting a stack
 */
struct StackConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Stack"
    static var description: IntentDescription = IntentDescription("Select a stack to monitor")

    @Parameter(title: "Stack")
    var stack: StackEntity?
}
