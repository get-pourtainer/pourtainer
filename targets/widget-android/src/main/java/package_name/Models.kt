import android.content.Context
import com.google.gson.Gson
import expo.modules.widgetkit.Connection
import java.util.UUID

val appGroupName: String = "group.com.pourtainer.mobile"
val savedConnectionsKey: String = "pourtainer::connections"
val isSubscribedKey: String = "pourtainer::subscribed"

/**
 * Connections written by the app's WidgetKit module. Entries without a URL or
 * token are skipped instead of failing the whole list.
 */
fun loadConnections(context: Context): List<Connection> {
    val prefs = context.getSharedPreferences(appGroupName, Context.MODE_PRIVATE)
    val raw = prefs.getString(savedConnectionsKey, "[]") ?: "[]"
    val parsed = runCatching { Gson().fromJson(raw, Array<Connection>::class.java) }.getOrNull()
        ?: emptyArray()

    return parsed
        .filter { !it.url.isNullOrBlank() && !it.accessToken.isNullOrBlank() }
        .map { connection -> connection.apply { url = url?.trimEnd('/') } }
}

fun isSubscribed(context: Context): Boolean =
    context.getSharedPreferences(appGroupName, Context.MODE_PRIVATE).getBoolean(isSubscribedKey, false)

/** Compose projects first, then Swarm stacks; the same rule the app uses. */
fun stackNameFrom(labels: Map<String, String>?): String? =
    labels?.get("com.docker.compose.project") ?: labels?.get("com.docker.stack.namespace")

data class RawContainerResponse(
    val Id: String,
    val Names: Array<String>,
    val State: String,
    val Labels: Map<String, String>?
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
    val Labels: Map<String, String>?
)

val Connection.safeConnectionId: String
    get() = this.id ?: ""

data class Endpoint(
    val Id: Int,
    val Name: String
)

/** Runtime container as fetched from the API; carries the live connection. */
data class Container(
    val id: String,
    val name: String,
    val state: String,
    val stackName: String? = null,
    val connection: Connection,
    val endpoint: Endpoint
)

/** What a widget remembers about its pick: no token, only the connection id. */
data class SelectedContainer(
    val id: String,
    val name: String,
    val connectionId: String,
    val endpoint: Endpoint
) {
    companion object {
        fun from(container: Container) = SelectedContainer(
            id = container.id,
            name = container.name,
            connectionId = container.connection.safeConnectionId,
            endpoint = container.endpoint
        )
    }
}

/** Last fetched status, persisted for rendering (again without the token). */
data class ContainerMetadata(
    val id: String,
    val name: String,
    val state: String,
    val stackName: String? = null,
    val connectionId: String,
    val endpoint: Endpoint
) {
    companion object {
        fun from(container: Container) = ContainerMetadata(
            id = container.id,
            name = container.name,
            state = container.state,
            stackName = container.stackName,
            connectionId = container.connection.safeConnectionId,
            endpoint = container.endpoint
        )
    }
}

data class LogLine(
    val id: UUID,
    val content: String
) {
    constructor(content: String): this(UUID.randomUUID(), content)
}

data class Stack(
    val id: String,
    val name: String,
    val containerCount: Int
)

enum class WidgetIntentState {
    LOADING,
    API_FAILED,
    HAS_CONTAINERS,
    NO_CONTAINERS,
    NOT_FOUND;

    companion object {
        /** Persisted by name; anything unknown counts as loading. */
        fun parse(raw: String?): WidgetIntentState =
            entries.firstOrNull { it.name == raw } ?: LOADING
    }
}
