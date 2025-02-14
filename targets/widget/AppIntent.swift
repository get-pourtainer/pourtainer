import WidgetKit
import AppIntents

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    init() {}

    init(container: ContainerSetting) {
      self.container = container
    }
  
    static var title: LocalizedStringResource { "Select Container" }
    static var description: IntentDescription { "Select your Docker container" }

    @Parameter(title: "Select container")
    var container: ContainerSetting?

}
