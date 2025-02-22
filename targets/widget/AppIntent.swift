import WidgetKit
import AppIntents

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Select Container" }
    static var description: IntentDescription { "Select your Docker container" }

    @Parameter(title: "Select container")
    var container: ContainerListItem?
}
