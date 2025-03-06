import WidgetKit
import SwiftUI

/**
 * Timeline provider for the Container widget
 * Responsible for providing widget timeline entries and data
 */
struct Provider: AppIntentTimelineProvider {
    /**
     * This function will be called BEFORE widget is initialized
     * We should pass here placeholder data for the widget loading state
     * Used during widget gallery preview and initial loading
     */
    func placeholder(in context: Context) -> WidgetEntry {
        placeholderWidget
    }

    /**
     * This function will be called when user configures the widget
     * or when viewing in the home screen widget gallery
     * Should display placeholder data that represents the widget appearance
     */
    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> WidgetEntry {
        placeholderWidget
    }

    /**
     * Responsible for telling iOS WHEN widget should update + fetching data
     * Creates a timeline of widget entries that determine when to refresh
     * This is the main function that provides real data to the widget
     * Enhanced with proper task management and cancellation handling
     * 
     * @param configuration The user's widget configuration with selected container
     * @param context The widget context information
     * @return Timeline with entries and refresh policy
     */
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<WidgetEntry> {
        // Check for task cancellation at entry point
        try? Task.checkCancellation()
        
        var entries: [WidgetEntry] = []

        let currentDate = Date()
        let connections = self.getConnections()
        let hasContainers = self.hasContainers()
        
        // Early return if container configuration is incomplete
        guard let containerId = configuration.container?.id,
              let connection = configuration.container?.connection,
              let endpoint = configuration.container?.endpoint else {
            // No container selected, use the original timeline approach
            let refreshPolicy: TimelineReloadPolicy = .atEnd
            
            // Create timeline entries every 15 minutes for the next 5 hours
            // This determines how often widget content will appear to update
            for minuteOffset in stride(from: 0, to: 60 * 5, by: 15) {
                let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!

                let entry = WidgetEntry(
                    date: entryDate, 
                    hasConnections: !connections.isEmpty, 
                    hasContainers: hasContainers, 
                    selectedContainer: nil,
                    logLines: []
                )

                entries.append(entry)
            }
            
            return Timeline(entries: entries, policy: refreshPolicy)
        }
        
        // Try to fetch the selected container
       var container: Container?
        do {
            // Create a high-priority task for fetching the container
            // User-initiated priority is appropriate for foreground operations
            let containerTask = Task(priority: .userInitiated) {
                try await fetchContainer(
                    connection: connection, 
                    endpoint: endpoint, 
                    containerId: containerId
                )
            }
            
            // Await the result, which can throw if cancelled
            container = try await containerTask.value
            
            // If container name starts with '/', create a new container with the modified name
            if let fetchedContainer = container, fetchedContainer.Name.hasPrefix("/") {
                let modifiedName = String(fetchedContainer.Name.dropFirst())
                container = Container(
                    Id: fetchedContainer.Id,
                    Name: modifiedName,
                    State: fetchedContainer.State
                )
            }
        } catch is CancellationError {
            // Handle cancellation gracefully
            container = nil
        } catch {
            // Handle other errors
            print("Error fetching container: \(error.localizedDescription)")
            container = nil
        }

        // Determine an appropriate refresh policy based on container state
        let refreshPolicy: TimelineReloadPolicy
        if let container = container {
            switch container.State.Status {
            case "running":
                // Active containers should update more frequently
                refreshPolicy = .after(Date().addingTimeInterval(5 * 60)) // 5 minutes
            case "exited":
                // Inactive containers can update less frequently
                refreshPolicy = .after(Date().addingTimeInterval(30 * 60)) // 30 minutes
            default:
                // Unknown status - use a moderate refresh rate
                refreshPolicy = .after(Date().addingTimeInterval(15 * 60)) // 15 minutes
            }
        } else {
            // Container fetch failed, use a moderate refresh rate
            refreshPolicy = .after(Date().addingTimeInterval(15 * 60)) // 15 minutes
        }
        
        // Fetch logs if we have a valid container
        var logLines: [LogLine] = []
        if let container = container {
            do {
                // Create a task for fetching logs with lower priority
                let logsTask = Task(priority: .utility) {
                    try await fetchLogs(
                        connection: connection,
                        endpoint: endpoint,
                        containerId: containerId
                    )
                }
                
                // Await logs result
                let logs = try await logsTask.value
                
                // Process logs into separate lines
                if !logs.isEmpty {
                    // Split logs into lines, filter empty ones, and convert to LogLine objects
                    let rawLines = logs.components(separatedBy: .newlines)
                        .filter { !$0.isEmpty }
                    
                    // Limit to most recent 10 lines
                    let limitedLines = rawLines.count > 10 ? Array(rawLines.suffix(10)) : rawLines
                    
                    // Process and create LogLine objects
                    logLines = limitedLines.map { line in
                        let processedLine: String
                        if line.count > 150 {
                            processedLine = String(line.prefix(150)) + "..."
                        } else {
                            processedLine = line
                        }
                        return LogLine(content: processedLine)
                    }
                }
            } catch {
                print("Error fetching logs: \(error.localizedDescription)")
                // Don't fail the widget if logs can't be fetched
                logLines = []
            }
        }
        
        // Create a single entry with the smart refresh policy
        let entry = WidgetEntry(
            date: currentDate,
            hasConnections: !connections.isEmpty, 
            hasContainers: hasContainers, 
            selectedContainer: container,
            logLines: logLines
        )
        
        return Timeline(entries: [entry], policy: refreshPolicy)
    }

    /**
     * Gets stored connections from UserDefaults
     * Retrieves saved Pourtainer connections from shared app group storage
     * 
     * @return Array of Connection objects, or empty array if none found
     */
    private func getConnections() -> [Connection] {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
              let rawExistingConnections = sharedDefaults.data(forKey: connectionsKey) else {
            return []
        }

        return (try? JSONDecoder().decode([Connection].self, from: rawExistingConnections)) ?? []
    }

    /**
     * Checks if the app has any containers stored
     * Determines whether containers are available based on widget state
     * 
     * @return Boolean indicating if containers are available
     */
    private func hasContainers() -> Bool {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName) else {
            return false
        }

        let state = WidgetIntentState(rawValue: sharedDefaults.integer(forKey: widgetStateKey))
      
        return state == .hasContainers
    }
}

/**
 * Main widget definition for container monitoring
 * Configures the widget appearance and behavior
 * Entry point for the widget's lifecycle and rendering
 */
struct ContainerWidget: Widget {
    let kind: String = "widget"
	
    /**
     * Gets the current widget state from UserDefaults
     * @return The current WidgetIntentState or nil if not set
     */
    private func getWidgetState() -> WidgetIntentState? {
      guard let sharedDefaults = UserDefaults(suiteName: appGroupName) else {
          return nil
      }
      
      return WidgetIntentState(rawValue: sharedDefaults.integer(forKey: widgetStateKey))
    }

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { widget in
            // Switch on the widget state to display the appropriate view
            switch (widget.hasConnections, widget.hasContainers, self.getWidgetState(), widget.selectedContainer) {
            // Case: No connections - user needs to sign in
            case (false, _, _, _):
                EntryView(
                    title: "Unauthorized", 
                    description: "Sign in with Pourtainer app"
                )
                .containerBackground(Color("$background"), for: .widget)
                
            // Case: No containers available
            case (true, false, _, _), (true, true, .noContainers, nil):
                EntryView(
                    title: "No containers", 
                    description: "Add your first Container to show it here."
                )
                .containerBackground(Color("$background"), for: .widget)
                
            // Case: Containers available but not selected in widget config
            case (true, true, .hasContainers, nil):
                EntryView(
                    title: "Container not found", 
                    description: "Please select another Container."
                )
                .containerBackground(Color("$background"), for: .widget)
                
            // Case: API error
            case (true, true, .apiFailed, nil):
                EntryView(
                    title: "Api error", 
                    description: "We couldn't fetch data from the API."
                )
                .containerBackground(Color("$background"), for: .widget)
                
            // Case: Loading or unknown state
            case (true, true, .loading, nil), (true, true, .none, nil):
                EntryView(
                    title: "Loading...", 
                    description: "We're getting your Container details."
                )
                .containerBackground(Color("$background"), for: .widget)
                
            // Case: Container successfully loaded - show container info
            case (true, true, _, let container?):
                WidgetEntryView(
                    selectedContainer: container,
                    logLines: widget.logLines
                )
                .containerBackground(Color("$background"), for: .widget)
            }
        }
        .configurationDisplayName("Container")
        .description("Displays container status and real-time logs.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

/**
 * Preview provider for the widget in Xcode
 * Shows multiple states of the widget for design and testing
 * Demonstrates all possible widget states in the preview canvas
 */
#Preview("Container Widget", as: .systemSmall) {
    ContainerWidget()
} timeline: {
    // Unauthorized state
    WidgetEntry(
        date: .now, 
        hasConnections: false, 
        hasContainers: false, 
        selectedContainer: nil,
        logLines: []
    )
    // Signed in but no containers
    WidgetEntry(
        date: .now, 
        hasConnections: true, 
        hasContainers: false, 
        selectedContainer: nil,
        logLines: []
    )
    // Has containers but none selected
    WidgetEntry(
        date: .now, 
        hasConnections: true, 
        hasContainers: true, 
        selectedContainer: nil,
        logLines: []
    )
    // Container running state
    WidgetEntry(
        date: .now,
        hasConnections: true,
        hasContainers: true,
        selectedContainer: Container(
            Id: "1", 
            Name: "Pourtainer", 
            State: ContainerState(StartedAt: "", Status: "running")
        ),
        logLines: [
            LogLine(content: "Starting application..."),
            LogLine(content: "Connected to database"),
            LogLine(content: "Server listening on port 8080"),
            LogLine(content: "Received first request"),
            LogLine(content: "Processing data...")
        ]
    )
    // Container exited state
    WidgetEntry(
        date: .now,
        hasConnections: true,
        hasContainers: true,
        selectedContainer: Container(
            Id: "1", 
            Name: "Pourtainer", 
            State: ContainerState(StartedAt: "", Status: "exited")
        ),
        logLines: [LogLine(content: "Process exited with code 0")]
    )
    // Container unknown state
    WidgetEntry(
        date: .now,
        hasConnections: true,
        hasContainers: true,
        selectedContainer: Container(
            Id: "1", 
            Name: "Pourtainer", 
            State: ContainerState(StartedAt: "", Status: "unknown")
        ),
        logLines: [LogLine(content: "Status update pending...")]
    )
}
