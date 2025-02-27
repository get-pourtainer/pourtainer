import expo.modules.widgetkit.Instance

val packageName: String = "com.pourtainer.mobile"
val appGroupName: String = "group.com.pourtainer.mobile"
val savedInstancesKey: String = "pourtainer::instances"
val savedWidgetStateKey: String = "pourtainer::widgetState"

data class Endpoint(
    val Id: Int

    // add more fields if necessary
)

data class RawContainer(
    val Id: String,
    val Names: Array<String>,
    val Status: String

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
    val instance: Instance,
    val endpoint: Endpoint
)

enum class WidgetIntentState(val value: Int) {
    LOADING(0),
    API_FAILED(1),
    HAS_CONTAINERS(2),
    NO_CONTAINERS(3)
}
