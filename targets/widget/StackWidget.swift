import SwiftUI
import WidgetKit
import AppIntents

/**
 * Provider for the Stack Widget
 * Handles data fetching and timeline generation for stack widget
 */
struct StackWidgetProvider: AppIntentTimelineProvider {
    typealias Entry = StackWidgetEntry
    typealias Intent = StackConfigurationIntent
    
    /**
     * This function will be called BEFORE widget is initialized
     * We should pass here placeholder data for the widget loading state
     * Used during widget gallery preview and initial loading
     */
    func placeholder(in context: Context) -> StackWidgetEntry {
        return placeholderStackWidget
    }
    
    /**
     * This function will be called when user configures the widget
     * or when viewing in the home screen widget gallery
     * Should display placeholder data that represents the widget appearance
     */
    func snapshot(for configuration: StackConfigurationIntent, in context: Context) async -> StackWidgetEntry {
        return placeholderStackWidget
    }
    
    /**
     * Responsible for telling iOS WHEN widget should update + fetching data
     * Creates a timeline of widget entries that determine when to refresh
     * This is the main function that provides real data to the widget
     * Enhanced with proper task management and cancellation handling
     */
    func timeline(for configuration: StackConfigurationIntent, in context: Context) async -> Timeline<StackWidgetEntry> {
        // Check for task cancellation at entry point
        try? Task.checkCancellation()
		
		var isSubscribed: Bool = false
		
		if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
			let isSubscribedValue = sharedDefaults.bool(forKey: isSubscribedKey)
			
			isSubscribed = isSubscribedValue
		}
        
        let currentDate = Date()
        
        // Load connections from shared UserDefaults
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
              let rawExistingConnections = sharedDefaults.data(forKey: connectionsKey),
              let connections = try? JSONDecoder().decode([Connection].self, from: rawExistingConnections),
              !connections.isEmpty
        else {
            return Timeline(
                entries: [StackWidgetEntry(
                    date: currentDate,
                    hasConnections: false,
                    hasContainers: false,
                    selectedStack: nil,
                    containers: [],
                    isSubscribed: isSubscribed
                )],
                policy: .after(currentDate.addingTimeInterval(15 * 60))
            )
        }
        
        // Get the selected stack or default to nil
        guard let stackEntity = configuration.stack,
              let connection = configuration.stack?.connection,
              let endpoint = configuration.stack?.endpoint else {
            return Timeline(
                entries: [StackWidgetEntry(
                    date: currentDate,
                    hasConnections: true,
                    hasContainers: false,
                    selectedStack: nil,
                    containers: [],
                    isSubscribed: isSubscribed
                )],
                policy: .after(currentDate.addingTimeInterval(15 * 60))
            )
        }
        
        var containers: [ContainerWithLogs] = []
        
        do {
            // Create a high-priority task for fetching containers
            let containerTask = Task(priority: .userInitiated) {
                try await fetchContainersForStack(
                    connection: connection,
                    endpoint: endpoint,
                    stackName: stackEntity.name
                )
            }
            
            // Await the containers result
            let rawContainers = try await containerTask.value
            
            guard !rawContainers.isEmpty else {
                return Timeline(
                    entries: [StackWidgetEntry(
                        date: currentDate,
                        hasConnections: true,
                        hasContainers: false,
                        selectedStack: stackEntity.name,
                        containers: [],
                        isSubscribed: isSubscribed
                    )],
                    policy: .after(currentDate.addingTimeInterval(15 * 60))
                )
            }
            
            // Process containers in parallel for better performance
            containers = await withTaskGroup(of: ContainerWithLogs?.self) { group in
                for rawContainer in rawContainers {
                    group.addTask {
                        // Clean up container name
                        let cleanName = rawContainer.Names.first?.replacingOccurrences(of: "/", with: "") ?? "Unknown"
                        
                        // Determine container status
                        let statusLowercase = rawContainer.Status.lowercased()
                        let status: String
                        
                        if statusLowercase.contains("up") {
                            status = "running"
                        } else if statusLowercase.contains("exited") {
                            status = "exited"
                        } else {
                            status = "unknown"
                        }
                        
                        // Try to fetch logs for this container
                        var lastLogLine: LogLine? = nil
                        
                        if status == "running" {
                            do {
                                let logsTask = Task(priority: .utility) {
                                    try await fetchLogs(
                                        connection: connection,
                                        endpoint: endpoint,
                                        containerId: rawContainer.Id
                                    )
                                }
                                
                                let logs = try await logsTask.value
                                
                                // Split logs by newline and get the last line
                                let logLines = logs.components(separatedBy: "\n")
                                if let lastLine = logLines.last, !lastLine.isEmpty {
                                    lastLogLine = LogLine(content: lastLine)
                                } else if logLines.count > 1 {
                                    // If the last line is empty, use the second to last line
                                    lastLogLine = LogLine(content: logLines[logLines.count - 2])
                                }
                            } catch {
                                // If log fetching fails, don't prevent container from showing
                                print("Error fetching logs for \(cleanName): \(error.localizedDescription)")
                            }
                        }
                        
                        return ContainerWithLogs(
                            id: rawContainer.Id,
                            name: cleanName,
                            status: status,
                            lastLogLine: lastLogLine
                        )
                    }
                }
                
                // Collect results from all tasks
                var result: [ContainerWithLogs] = []
                for await container in group {
                    if let container = container {
                        result.append(container)
                    }
                }
                
                // Sort containers alphabetically by name
                return result.sorted(by: { $0.name < $1.name })
            }
            
        } catch {
            print("Failed to fetch stack containers: \(error.localizedDescription)")
            
            return Timeline(
                entries: [StackWidgetEntry(
                    date: currentDate,
                    hasConnections: true,
                    hasContainers: false,
                    selectedStack: stackEntity.name,
                    containers: [],
                    isSubscribed: isSubscribed
                )],
                policy: .after(currentDate.addingTimeInterval(15 * 60))
            )
        }
        
        // Determine refresh policy based on container states
        let refreshPolicy: TimelineReloadPolicy
        let hasRunningContainers = containers.contains(where: { $0.status == "running" })
        
        if hasRunningContainers {
            // If there are running containers, refresh more frequently
            refreshPolicy = .after(currentDate.addingTimeInterval(5 * 60)) // 5 minutes
        } else {
            // Otherwise, refresh less frequently
            refreshPolicy = .after(currentDate.addingTimeInterval(30 * 60)) // 30 minutes
        }
        
        let entry = StackWidgetEntry(
            date: currentDate,
            hasConnections: true,
            hasContainers: true,
            selectedStack: stackEntity.name,
            containers: containers,
            isSubscribed: isSubscribed
        )
        
        return Timeline(
            entries: [entry],
            policy: refreshPolicy
        )
    }
}

/**
 * View for the Stack Widget
 * Displays a list of containers with their status and last log line
 */
struct StackWidgetEntryView: View {
    var entry: StackWidgetEntry
    @Environment(\.widgetFamily) var family
    
    private var backgroundColor: Color {
        if #available(iOS 26.0, *) {
          return Color.clear
        } else {
          return Color("$background")
        }
    }
    
    var body: some View {
        if !entry.hasConnections {
            placeholderView(
                title: "Unauthorized",
                description: "Sign in with Pourtainer app."
            )
            .containerBackground(backgroundColor, for: .widget)
        } else if entry.selectedStack == nil {
            placeholderView(
                title: "Stack not selected",
                description: "Please select a Stack."
            )
            .containerBackground(backgroundColor, for: .widget)
        } else if !entry.hasContainers || entry.containers.isEmpty {
            placeholderView(
                title: "No containers",
                description: "Stack '\(entry.selectedStack ?? "")' has no containers."
            )
            .containerBackground(backgroundColor, for: .widget)
        } else if !entry.isSubscribed {
            placeholderView(
                title: "Subscription missing",
                description: "Tap here to enable"
            )
            .containerBackground(backgroundColor, for: .widget)
			.widgetURL(URL(string: "pourtainer://?showPaywall=1"))
        } else {
            mainContent
                .containerBackground(backgroundColor, for: .widget)
        }
    }
    
    /// Helper function for placeholder states that matches main UI styling
    private func placeholderView(title: String, description: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 8) {
                Text(title)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(Color("$text"))
                
                Spacer()
            }
            .padding(.horizontal, 8)
            .padding(.top, 6)
            .padding(.bottom, 6)
            
            Text(description)
                .font(.system(size: 14))
                .foregroundColor(Color("$text").opacity(0.7))
                .padding(.horizontal, 8)
            
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    
    var mainContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack(alignment: .center, spacing: 8) {
                Text(entry.selectedStack ?? "Stack")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(Color("$text"))
                
                Spacer()
                
                Text("\(entry.containers.count) containers")
                    .font(.system(size: 12))
                    .foregroundColor(Color("$text").opacity(0.7))
            }
            .padding(.horizontal, 8)
            .padding(.top, 6)
            .padding(.bottom, 6)
            
            // Container list
            VStack(spacing: 12) {
                ForEach(entry.containers) { container in
                    containerView(for: container)
                    
                    if container.id != entry.containers.last?.id {
                        Divider()
                            .background(Color("$text").opacity(0.2))
                            .padding(.horizontal, 8)
                    }
                }
            }
            .padding(.bottom, 6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    
    func containerView(for container: ContainerWithLogs) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            // Container name and status
            HStack(alignment: .center, spacing: 8) {
                Text(container.name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color("$text"))
                
                StatusView(status: container.status)
                
                Spacer()
            }
            
            // Log line
            if let logLine = container.lastLogLine {
                Text(logLine.content)
                    .font(.system(size: 12))
                    .foregroundColor(Color("$text").opacity(0.7))
                    .lineLimit(1)
            } else {
                Text("No logs available")
                    .font(.system(size: 12))
                    .foregroundColor(Color("$text").opacity(0.7))
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 8)
    }
}

/**
 * Status indicator view component
 * Displays container status with appropriate color
 */
struct StatusView: View {
    let status: String
    
    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)
            Text(status)
                .font(.system(size: 12))
                .foregroundColor(statusColor)
        }
    }
    
    var statusColor: Color {
        switch status {
        case "running":
            return Color("$success")
        case "exited":
            return Color("$error")
        default:
            return Color("$warning")
        }
    }
}

/**
 * Preview for the stack widget
 */
struct StackWidgetEntryView_Previews: PreviewProvider {
    static var previews: some View {
        StackWidgetEntryView(entry: placeholderStackWidget)
            .previewContext(WidgetPreviewContext(family: .systemLarge))
    }
}

/**
 * Stack Widget definition for displaying containers in a stack
 * Uses a stack selection intent to configure which stack to display
 * Shows containers and their logs in a system large widget
 */
struct StackContainersWidget: Widget {
    let kind: String = "StackContainersWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: StackConfigurationIntent.self,
            provider: StackWidgetProvider()
        ) { entry in
            StackWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Stack")
        .description("Displays containers from a selected stack with their logs.")
        .supportedFamilies([.systemLarge])
    }
} 
