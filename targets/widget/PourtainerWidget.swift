import WidgetKit
import SwiftUI

let APP_GROUP_NAME: String = "group.com.pourtainer.mobile"
let EXAMPLE_CLIENT: Client = Client(url: "url", accessToken: "accessToken", endpointId: 1)

struct Provider: AppIntentTimelineProvider {
    // this function will be called BEFORE widget is initialized
    // we should pass here placeholder data
    func placeholder(in context: Context) -> SimpleEntry {
      SimpleEntry(date: Date(), configuration: ConfigurationAppIntent(container: ContainerSetting(id: "1", name: "Example container")), client: EXAMPLE_CLIENT, status: "running")
    }

    // this function will be called when user configures the widget
    // or home screen, should also display placeholder data
    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
      SimpleEntry(date: Date(), configuration: ConfigurationAppIntent(container: ContainerSetting(id: "1", name: "Example container")), client: EXAMPLE_CLIENT, status: "running")
    }

    // responsible for telling iOS WHEN widget should update + fetching data
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        var entries: [SimpleEntry] = []

        let currentDate = Date()
        let container: Container? = if let containerId = configuration.container?.id {
            try? await getDockerContainer(id: containerId)
        } else {
            nil
        }

        // update widget every 15 minutes
        for minuteOffset in stride(from: 0, to: 60 * 5, by: 15) {
          let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!
          let entry = SimpleEntry(date: entryDate, configuration: configuration, client: EXAMPLE_CLIENT, status: container?.State.Status ?? "Loading...")

           entries.append(entry)
        }

        return Timeline(entries: entries, policy: .atEnd)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
    let client: Client?
    let status: String?
}

struct PourtainerWidget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
          if (entry.client == nil) {
            UnauthorizedEntryView()
              .containerBackground(Color("$background"), for: .widget)
          } else if (entry.configuration.container == nil) {
            EmptyEntryView()
                .containerBackground(Color("$background"), for: .widget)
          } else {
            WidgetEntryView(entry: entry)
                .containerBackground(Color("$background"), for: .widget)
          }
        }
        .supportedFamilies([.systemSmall])
    }
}

extension ConfigurationAppIntent {
    fileprivate static var running: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()

        intent.container = ContainerSetting(id: "1", name: "portainer")

        return intent
    }

    fileprivate static var empty: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()

        intent.container = nil

        return intent
    }
}

#Preview("Pourtainer Widget", as: .systemSmall) {
  PourtainerWidget()
} timeline: {
  SimpleEntry(date: .now, configuration: .empty, client: nil, status: nil)
  SimpleEntry(date: .now, configuration: .empty, client: EXAMPLE_CLIENT, status: nil)
  SimpleEntry(date: .now, configuration: .running, client: EXAMPLE_CLIENT, status: "running")
  SimpleEntry(date: .now, configuration: .running, client: EXAMPLE_CLIENT, status: "exited")
  SimpleEntry(date: .now, configuration: .running, client: EXAMPLE_CLIENT, status: "unknown")
}
