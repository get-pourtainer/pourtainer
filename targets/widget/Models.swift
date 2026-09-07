import Foundation
import WidgetKit

// App group ID for sharing data between the app and the widget
let appGroupName: String = "group.com.pourtainer.mobile"

// UserDefaults keys written by the app's WidgetKit module
let connectionsKey: String = "pourtainer::connections"
let isSubscribedKey: String = "pourtainer::subscribed"

let sharedDefaults = UserDefaults(suiteName: appGroupName)

// Represents a Pourtainer server connection with authentication credentials
struct Connection: Codable, Hashable {
    let url: String
    let accessToken: String
    let id: String
}

/// Decodes the connection list the app writes. Entries that lack a URL or
/// token are skipped instead of failing the whole list.
func loadConnections() -> [Connection] {
    guard let raw = sharedDefaults?.data(forKey: connectionsKey) else {
        return []
    }

    struct LossyConnection: Decodable {
        let url: String?
        let accessToken: String?
        let id: String?
    }

    let decoded = (try? JSONDecoder().decode([LossyConnection].self, from: raw)) ?? []

    return decoded.compactMap { entry in
        guard let url = entry.url, !url.isEmpty,
              let accessToken = entry.accessToken, !accessToken.isEmpty,
              let id = entry.id, !id.isEmpty else {
            return nil
        }
        let trimmedUrl = url.hasSuffix("/") ? String(url.dropLast()) : url
        return Connection(url: trimmedUrl, accessToken: accessToken, id: id)
    }
}

func isSubscribed() -> Bool {
    sharedDefaults?.bool(forKey: isSubscribedKey) ?? false
}

/// Compose projects first, then Swarm stacks; the same rule the app uses.
func stackName(from labels: [String: String]?) -> String? {
    labels?["com.docker.compose.project"] ?? labels?["com.docker.stack.namespace"]
}

// Represents a Docker endpoint in Pourtainer
struct Endpoint: Codable, Hashable {
    let Id: Int
    let Name: String
}

// Represents raw container data as returned directly from the API
struct RawContainer: Decodable {
    let Id: String
    let Names: [String]
    let Status: String
    let Labels: [String: String]?
}

// Represents container state information
struct ContainerState: Codable {
    let StartedAt: String?
    let Status: String
}

// Represents a Docker container with essential information
struct Container: Codable {
    let Id: String
    let Name: String
    let State: ContainerState
}

/// Widget entity ids must survive offline, so they name the connection and
/// endpoint alongside the container or stack: "<connection>|<endpoint>|<item>".
struct EntityIdentifier {
    let connectionId: String
    let endpointId: Int
    let itemId: String

    var rawValue: String { "\(connectionId)|\(endpointId)|\(itemId)" }

    init(connectionId: String, endpointId: Int, itemId: String) {
        self.connectionId = connectionId
        self.endpointId = endpointId
        self.itemId = itemId
    }

    init?(rawValue: String) {
        let parts = rawValue.split(separator: "|", maxSplits: 2, omittingEmptySubsequences: false)
        guard parts.count == 3, let endpointId = Int(parts[1]) else { return nil }
        self.connectionId = String(parts[0])
        self.endpointId = endpointId
        self.itemId = String(parts[2])
    }
}

/// What the picker knew about an entity, so it can be rehydrated without network.
struct EntitySnapshot: Codable {
    let name: String
    let stackName: String?
    let endpointName: String
    var containerCount: Int? = nil
}

/// Last successful fetch, shown while the server is unreachable.
struct LastGoodEntry: Codable {
    let container: Container
    let logLines: [String]
    let date: Date
}

/// What the pickers learned about entities, one map per kind, plus the last
/// good entry per placed widget. One app-group write per picker run.
enum WidgetCache {
    enum Kind: String { case container, stack }

    private static let lastEntryPrefix = "pourtainer::lastEntry::"
    private static let encoder = JSONEncoder()
    private static let decoder = JSONDecoder()

    private static func store<T: Encodable>(_ value: T, key: String) {
        guard let data = try? encoder.encode(value) else { return }
        sharedDefaults?.set(data, forKey: key)
    }

    private static func load<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = sharedDefaults?.data(forKey: key) else { return nil }
        return try? decoder.decode(type, from: data)
    }

    private static func entitiesKey(_ kind: Kind) -> String {
        "pourtainer::entities::\(kind.rawValue)"
    }

    /// The "connection|endpoint" part of a composite id.
    private static func scope(_ id: String) -> String {
        id.split(separator: "|", maxSplits: 2, omittingEmptySubsequences: false)
            .prefix(2)
            .joined(separator: "|")
    }

    static func loadEntities(_ kind: Kind) -> [String: EntitySnapshot] {
        load([String: EntitySnapshot].self, key: entitiesKey(kind)) ?? [:]
    }

    /// Replaces the snapshots of every scope that was listed and keeps the
    /// others (unreachable servers), so the map stays bounded by what exists.
    static func storeEntities(_ snapshots: [String: EntitySnapshot], kind: Kind) {
        guard !snapshots.isEmpty else { return }
        let listed = Set(snapshots.keys.map(scope))
        let kept = loadEntities(kind).filter { !listed.contains(scope($0.key)) }
        store(kept.merging(snapshots) { _, new in new }, key: entitiesKey(kind))
    }

    static func storeLastEntry(_ entry: LastGoodEntry, id: String) {
        store(entry, key: lastEntryPrefix + id)
    }

    static func loadLastEntry(id: String) -> LastGoodEntry? {
        load(LastGoodEntry.self, key: lastEntryPrefix + id)
    }
}

/**
 * A log line with a unique identifier to avoid ForEach duplicate ID errors
 */
struct LogLine: Identifiable, Hashable {
    let id: UUID
    let content: String

    init(content: String) {
        self.id = UUID()
        self.content = content
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: LogLine, rhs: LogLine) -> Bool {
        return lhs.id == rhs.id
    }
}

/// Everything the container widget view needs, decided once per timeline.
enum WidgetStatus {
    case unauthorized
    case unsubscribed
    case notConfigured
    case notFound
    case apiError(lastKnown: Container?, logLines: [LogLine])
    case loaded(Container, [LogLine])
}

// Widget timeline entry data structure used to provide data to the widget views
struct WidgetEntry: TimelineEntry {
    let date: Date
    let status: WidgetStatus
    let connectionId: String?  // Connection ID for deep linking
    let endpointId: Int?       // Endpoint ID for deep linking
}

// Default placeholder widget for previews and initial loading states
let placeholderWidget: WidgetEntry = WidgetEntry(
    date: .now,
    status: .loaded(
        Container(Id: "1", Name: "Pourtainer", State: ContainerState(StartedAt: "", Status: "running")),
        [
            LogLine(content: "Starting application..."),
            LogLine(content: "Connected to database"),
            LogLine(content: "Server listening on port 8080"),
            LogLine(content: "Received first request")
        ]
    ),
    connectionId: "default-connection",
    endpointId: 1
)

/**
 * Represents a Docker Compose stack or container group
 */
struct Stack: Hashable, Identifiable {
    let id: String
    let name: String
    let containerCount: Int

    var identifier: String { id }
}

/**
 * Represents a container with its latest log line for display in the stack widget
 */
struct ContainerWithLogs: Identifiable {
    let id: String
    let name: String
    let status: String
    let lastLogLine: LogLine?

    var identifier: String { id }
}

/**
 * Widget timeline entry for the stack widget
 */
struct StackWidgetEntry: TimelineEntry {
    let date: Date
    let hasConnections: Bool
    let hasContainers: Bool
    let selectedStack: String?
    let containers: [ContainerWithLogs]
    let isSubscribed: Bool
}

// Default placeholder for the stack widget
let placeholderStackWidget: StackWidgetEntry = StackWidgetEntry(
    date: .now,
    hasConnections: true,
    hasContainers: true,
    selectedStack: "Frontend",
    containers: [
        ContainerWithLogs(id: "1", name: "web", status: "running", lastLogLine: LogLine(content: "Server started on port 3000")),
        ContainerWithLogs(id: "2", name: "nginx", status: "running", lastLogLine: LogLine(content: "Accepting connections on port 80")),
        ContainerWithLogs(id: "3", name: "redis", status: "running", lastLogLine: LogLine(content: "Ready to accept connections"))
    ],
    isSubscribed: true
)
