import WidgetKit
import SwiftUI

struct Provider: AppIntentTimelineProvider {
    // this function will be called BEFORE widget is initialized
    // we should pass here placeholder data
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationAppIntent())
    }

    // this function will be called when user configures the widget
    // or home screen, should also display placeholder data
    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: configuration)
    }

    // responsible for telling iOS WHEN widget should update
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        var entries: [SimpleEntry] = []
      
        // todo fetch data here

        let currentDate = Date()
      
        // update widget every 15 minutes
        for minuteOffset in stride(from: 0, to: 60 * 5, by: 15) {
           let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!
           let entry = SimpleEntry(date: entryDate, configuration: configuration)
          
           entries.append(entry)
        }

        return Timeline(entries: entries, policy: .atEnd)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
}

struct widgetEntryView : View {
    @Environment(\.colorScheme) var colorScheme
  
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .center) {
              Circle()
                .frame(width: 5, height: 5)
                .foregroundColor(Color("$success"))
              Text("Running")
                .font(.system(size: 13))
                .foregroundColor(.black)
            }
            Text(entry.configuration.container)
              .font(.system(size: 16, weight: .bold))
              .foregroundColor(.black)
              .lineLimit(3)
              .truncationMode(.tail)
            Spacer()
            HStack {
               Text("Icon 1")
                .font(.system(size: 12))
               Spacer()
               Text("Icon 2")
                .font(.system(size: 12))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .supportedFamilies([.systemSmall])
    }
}

extension ConfigurationAppIntent {
    fileprivate static var smiley: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
      
        intent.container = "portainer_agent"
      
        return intent
    }

    fileprivate static var starEyes: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
      
        intent.container = "portainer_other"
      
        return intent
    }
}

#Preview(as: .systemSmall) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley)
    SimpleEntry(date: .now, configuration: .starEyes)
}
