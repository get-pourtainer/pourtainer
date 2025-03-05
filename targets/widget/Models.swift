import Foundation
import WidgetKit

// App group ID for sharing data between the app and the widget
let appGroupName: String = "group.com.pourtainer.mobile"
// UserDefaults keys for sharing data across app/widget
let instancesKey: String = "pourtainer::instances"
let widgetStateKey: String = "pourtainer::widgetState"

// Represents a Pourtainer server instance with authentication credentials
struct Instance: Decodable {
    let url: String
    let accessToken: String
    let instanceId: String
}

// Represents a Docker endpoint in Pourtainer
struct Endpoint: Decodable {
    let Id: Int
	let Name: String
	
    // add more fields if necessary
}

// Represents raw container data as returned directly from the API
struct RawContainer: Decodable {
    let Id: String
    let Names: [String]
    let Status: String
    let Labels: [String: String]?  // Container labels including stack information
}

// Represents container state information
struct ContainerState: Decodable {
    let StartedAt: String
    let Status: String
}

// Represents a Docker container with essential information
struct Container: Decodable {
    let Id: String             
    let Name: String           // Container name (cleaned)
    let State: ContainerState 
	
    // add more fields if necessary
}

// Enum representing possible widget states
enum WidgetIntentState: Int {
    case loading = 0
    case apiFailed = 1
    case hasContainers = 2
    case noContainers = 3
}

/**
 * A log line with a unique identifier to avoid ForEach duplicate ID errors
 * Wraps a plain string log line with a generated ID
 */
struct LogLine: Identifiable, Hashable {
    let id: UUID
    let content: String
    
    init(content: String) {
        self.id = UUID()
        self.content = content
    }
    
    // Required for Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    // Required for Equatable (implied by Hashable)
    static func == (lhs: LogLine, rhs: LogLine) -> Bool {
        return lhs.id == rhs.id
    }
}

// Widget timeline entry data structure used to provide data to the widget views
struct WidgetEntry: TimelineEntry {
    let date: Date                   // Required for timeline entries
    let hasInstances: Bool          
    let hasContainers: Bool         
    let selectedContainer: Container?
    let logLines: [LogLine]          // Array of log lines for the selected container
}

// Default placeholder widget for previews and initial loading states
let placeholderWidget: WidgetEntry = WidgetEntry(
    date: .now,
    hasInstances: true,
    hasContainers: true,
    selectedContainer: Container(Id: "1", Name: "Pourtainer", State: ContainerState(StartedAt: "", Status: "running")),
    logLines: [
        LogLine(content: "Starting application..."),
        LogLine(content: "Connected to database"),
        LogLine(content: "Server listening on port 8080"),
        LogLine(content: "Received first request")
    ]
)

/**
 * Options for container log requests
 * Controls timestamps, number of lines, and time range
 */
struct LogOptions {
    let timestamps: Bool   // Whether to show timestamps in logs
    let tail: Int          // Number of log lines to return (from the end)
    let since: Int         // Show logs since timestamp (Unix epoch seconds)
}

/**
 * Represents a Docker Compose stack or container group
 * For use in widget configuration intents
 */
struct Stack: Hashable, Identifiable {
    let id: String        // Using the stack name as ID
    let name: String      // Display name of the stack
    let containerCount: Int // Number of containers in the stack
    
    // For Identifiable conformance
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
 * Contains stack information and its containers with logs
 */
struct StackWidgetEntry: TimelineEntry {
    let date: Date
    let hasInstances: Bool
    let hasContainers: Bool
    let selectedStack: String?
    let containers: [ContainerWithLogs]
}

// Default placeholder for the stack widget
let placeholderStackWidget: StackWidgetEntry = StackWidgetEntry(
    date: .now,
    hasInstances: true,
    hasContainers: true,
    selectedStack: "Frontend",
    containers: [
        ContainerWithLogs(
            id: "1",
            name: "web",
            status: "running",
            lastLogLine: LogLine(content: "Server started on port 3000")
        ),
        ContainerWithLogs(
            id: "2",
            name: "nginx",
            status: "running",
            lastLogLine: LogLine(content: "Accepting connections on port 80")
        ),
        ContainerWithLogs(
            id: "3",
            name: "redis",
            status: "running",
            lastLogLine: LogLine(content: "Ready to accept connections")
        )
    ]
)
