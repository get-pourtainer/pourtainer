import WidgetKit
import AppIntents

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Configuration" }
    static var description: IntentDescription { "Select your Docker container" }

    @Parameter(title: "Container", default: "portainer")
    var container: String
}
