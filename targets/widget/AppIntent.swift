import WidgetKit
import AppIntents

/**
 * Intent definition for widget configuration
 * Allows users to select which Docker container to display in the widget
 * Used by the system when users add or edit the widget in the home screen
 * 
 * This is part of the AppIntents framework approach to widget configuration
 * which replaced the older IntentConfiguration and SiriKit intents in iOS 16+
 */
struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Pick a Container" }
    static var description: IntentDescription { "Will be used to show info in the widget." }

    @Parameter(title: "Container")
    var container: ContainerListItem?
}
