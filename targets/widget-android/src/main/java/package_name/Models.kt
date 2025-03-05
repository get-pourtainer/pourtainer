import expo.modules.widgetkit.Instance
import java.util.UUID

val packageName: String = "com.pourtainer.mobile"
val appGroupName: String = "group.com.pourtainer.mobile"
val savedInstancesKey: String = "pourtainer::instances"
val savedWidgetStateKey: String = "pourtainer::widgetState"

// Create a non-recursive property getter for Instance.instanceId
// This could be the issue - we were recursively calling itself
val Instance.safeInstanceId: String
    get() = this.instanceId ?: ""

data class Endpoint(
    val Id: Int,
    val Name: String
    // add more fields if necessary
)

data class RawContainer(
    val Id: String,
    val Names: Array<String>,
    val Status: String,
    val Labels: Map<String, String>?  // Container labels including stack information

    // add more fields if necessary
)

data class ContainerState(
    val StartedAt: String,
    val Status: String
)

data class Container(
    val Id: String,
    val Name: String,
    val State: ContainerState

    // add more fields if necessary
)

data class ContainerListItem(
    val id: String,
    val containerName: String,
    val stackName: String? = null,
    val instance: Instance,
    val endpoint: Endpoint
)

/**
 * A log line with a unique identifier to avoid list duplicate key errors
 * Wraps a plain string log line with a generated ID
 */
data class LogLine(
    val id: UUID,
    val content: String
) {
    constructor(content: String): this(UUID.randomUUID(), content)
}

/**
 * Options for container log requests
 * Controls timestamps, number of lines, and time range
 */
data class LogOptions(
    val timestamps: Boolean,   // Whether to show timestamps in logs
    val tail: Int,             // Number of log lines to return (from the end)
    val since: Int             // Show logs since timestamp (Unix epoch seconds)
)

/**
 * Represents a Docker Compose stack or container group
 */
data class Stack(
    val id: String,            // Using the stack name as ID
    val name: String,          // Display name of the stack
    val containerCount: Int    // Number of containers in the stack
)

/**
 * Represents a container with its latest log line for display in the stack widget
 */
data class ContainerWithLogs(
    val id: String,
    val name: String,
    val status: String,
    val lastLogLine: LogLine?
)

enum class WidgetIntentState(val value: Int) {
    LOADING(0),
    API_FAILED(1),
    HAS_CONTAINERS(2),
    NO_CONTAINERS(3)
}
