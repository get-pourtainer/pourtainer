import WidgetKit
import SwiftUI

/**
 * Timeline provider for the Container widget
 */
struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry {
        placeholderWidget
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> WidgetEntry {
        placeholderWidget
    }

    /**
     * Decides the widget status once and always schedules the next refresh, so
     * an unconfigured or failing widget recovers without launching the app.
     */
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<WidgetEntry> {
        let now = Date()
        let refreshPolicy: TimelineReloadPolicy = .after(now.addingTimeInterval(15 * 60))

        func timeline(_ status: WidgetStatus, connectionId: String? = nil, endpointId: Int? = nil) -> Timeline<WidgetEntry> {
            Timeline(
                entries: [WidgetEntry(date: now, status: status, connectionId: connectionId, endpointId: endpointId)],
                policy: refreshPolicy
            )
        }

        let connections = loadConnections()
        if connections.isEmpty {
            return timeline(.unauthorized)
        }

        if !isSubscribed() {
            return timeline(.unsubscribed)
        }

        // Always use the live token for the picked connection, not the one
        // captured when the widget was configured
        guard let item = configuration.container,
              let connection = connections.first(where: { $0.id == item.connection.id }) else {
            return timeline(.notConfigured)
        }

        let endpoint = item.endpoint

        do {
            // Independent requests, so they run concurrently
            async let fetched = fetchContainer(connection: connection, endpoint: endpoint, containerId: item.containerId)
            async let logLines = fetchLogLines(connection: connection, endpoint: endpoint, containerId: item.containerId)

            let result = try await fetched
            let container = Container(
                Id: result.Id,
                Name: result.Name.hasPrefix("/") ? String(result.Name.dropFirst()) : result.Name,
                State: result.State
            )
            let lines = await logLines

            WidgetCache.storeLastEntry(
                LastGoodEntry(container: container, logLines: lines.map(\.content), date: now),
                id: item.id
            )

            return timeline(.loaded(container, lines), connectionId: connection.id, endpointId: endpoint.Id)
        } catch let error as HTTPError where error.isNotFound {
            return timeline(.notFound, connectionId: connection.id, endpointId: endpoint.Id)
        } catch {
            // Transient failure: show the last good data when there is any
            let last = WidgetCache.loadLastEntry(id: item.id)
            let status = WidgetStatus.apiError(
                lastKnown: last?.container,
                logLines: (last?.logLines ?? []).map { LogLine(content: $0) }
            )
            return timeline(status, connectionId: connection.id, endpointId: endpoint.Id)
        }
    }

    /// Logs are optional: a container without readable logs still renders.
    private func fetchLogLines(connection: Connection, endpoint: Endpoint, containerId: String) async -> [LogLine] {
        guard let logs = try? await fetchLogs(connection: connection, endpoint: endpoint, containerId: containerId) else {
            return []
        }

        let lines = logs.components(separatedBy: "\n").filter { !$0.isEmpty }

        return lines.suffix(10).map { line in
            LogLine(content: line.count > 150 ? String(line.prefix(150)) + "..." : line)
        }
    }
}

/**
 * Main widget definition for container monitoring
 */
struct ContainerWidget: Widget {
    let kind: String = "ContainerWidget"

    private var backgroundColor: Color {
        if #available(iOS 26.0, *) {
            return Color.clear
        } else {
            return Color("$background")
        }
    }

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
            switch entry.status {
            case .unauthorized:
                EntryView(title: "Unauthorized", description: "Sign in with Pourtainer app")
                    .containerBackground(backgroundColor, for: .widget)

            case .unsubscribed:
                EntryView(title: "Subscription missing", description: "Tap here to enable")
                    .containerBackground(backgroundColor, for: .widget)
                    .widgetURL(URL(string: "pourtainer://?showPaywall=1"))

            case .notConfigured:
                EntryView(title: "Not configured", description: "Edit the widget to pick a Container.")
                    .containerBackground(backgroundColor, for: .widget)

            case .notFound:
                EntryView(title: "Container not found", description: "Please select another Container.")
                    .containerBackground(backgroundColor, for: .widget)

            case .apiError(let lastKnown, let logLines):
                if let container = lastKnown {
                    WidgetEntryView(
                        selectedContainer: container,
                        logLines: logLines,
                        connectionId: entry.connectionId,
                        endpointId: entry.endpointId
                    )
                } else {
                    EntryView(title: "Api error", description: "We couldn't reach the server.")
                        .containerBackground(backgroundColor, for: .widget)
                }

            case .loaded(let container, let logLines):
                WidgetEntryView(
                    selectedContainer: container,
                    logLines: logLines,
                    connectionId: entry.connectionId,
                    endpointId: entry.endpointId
                )
            }
        }
        .configurationDisplayName("Container")
        .description("Displays container status and real-time logs.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

#Preview("Container Widget", as: .systemSmall) {
    ContainerWidget()
} timeline: {
    WidgetEntry(date: .now, status: .unauthorized, connectionId: nil, endpointId: nil)
    WidgetEntry(date: .now, status: .unsubscribed, connectionId: nil, endpointId: nil)
    WidgetEntry(date: .now, status: .notConfigured, connectionId: nil, endpointId: nil)
    WidgetEntry(date: .now, status: .notFound, connectionId: nil, endpointId: nil)
    WidgetEntry(date: .now, status: .apiError(lastKnown: nil, logLines: []), connectionId: nil, endpointId: nil)
    WidgetEntry(
        date: .now,
        status: .loaded(
            Container(Id: "1", Name: "Pourtainer", State: ContainerState(StartedAt: "", Status: "running")),
            [
                LogLine(content: "Starting application..."),
                LogLine(content: "Connected to database"),
                LogLine(content: "Server listening on port 8080")
            ]
        ),
        connectionId: "preview-connection",
        endpointId: 1
    )
    WidgetEntry(
        date: .now,
        status: .loaded(
            Container(Id: "1", Name: "Pourtainer", State: ContainerState(StartedAt: "", Status: "exited")),
            [LogLine(content: "Process exited with code 0")]
        ),
        connectionId: "preview-connection",
        endpointId: 1
    )
}
