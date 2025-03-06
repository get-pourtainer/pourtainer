import expo.modules.widgetkit.Connection
import java.util.UUID

val packageName: String = "com.pourtainer.mobile"
val appGroupName: String = "group.com.pourtainer.mobile"
val savedConnectionsKey: String = "pourtainer::connections"
val savedWidgetStateKey: String = "pourtainer::widgetState"

data class RawContainerResponse(
    val Id: String,
    val Names: Array<String>,
	val State: String,
    val Labels: Map<String, String>?  // Container labels including stack information

    // add more fields if necessary
)

data class RawContainerDetailsResponse(
    val Id: String,
    val Name: String,
    val State: RawContainerDetailsResponseStateInfo,
    val Config: RawContainerDetailsResponseConfigInfo
)

data class RawContainerDetailsResponseStateInfo(
    val Status: String
)

data class RawContainerDetailsResponseConfigInfo(
    val Labels: Map<String, String>?  // Container labels including stack information
)
	
// Create a non-recursive property getter for Connection.connectionId
// This could be the issue - we were recursively calling itself
val Connection.safeConnectionId: String
    get() = this.id ?: ""

data class Endpoint(
    val Id: Int,
    val Name: String
    // add more fields if necessary
)


data class Container(
    val id: String,
    val name: String,
    val state: String,

    // add more fields if necessary
	
	val stackName: String? = null,
    val connection: Connection,
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
 * Represents a Docker Compose stack or container group
 */
data class Stack(
    val id: String,            // Using the stack name as ID
    val name: String,          // Display name of the stack
    val containerCount: Int    // Number of containers in the stack
)

enum class WidgetIntentState(val value: Int) {
    LOADING(0),
    API_FAILED(1),
    HAS_CONTAINERS(2),
    NO_CONTAINERS(3)
}
