import WidgetKit
import SwiftUI

struct Provider: AppIntentTimelineProvider {
    // this function will be called BEFORE widget is initialized
    // we should pass here placeholder data
    func placeholder(in context: Context) -> WidgetEntry {
        placeholderWidget
    }

    // this function will be called when user configures the widget
    // or home screen, should also display placeholder data
    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> WidgetEntry {
        placeholderWidget
    }

    // responsible for telling iOS WHEN widget should update + fetching data
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<WidgetEntry> {
        var entries: [WidgetEntry] = []

        let currentDate = Date()
        let instances = self.getInstances()
        let hasContainers = self.hasContainers()
        let container: Container? = if let containerId = configuration.container?.id,
                                       let instance = configuration.container?.instance,
                                       let endpoint = configuration.container?.endpoint {
            try? await fetchContainer(instance: instance, endpoint: endpoint, containerId: containerId)
        } else {
            nil
        }

        // update widget every 15 minutes
        for minuteOffset in stride(from: 0, to: 60 * 5, by: 15) {
            let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!

            let entry: WidgetEntry = if let container = container {
                WidgetEntry(date: entryDate, hasInstances: !instances.isEmpty, hasContainers: hasContainers, selectedContainer: container)
            } else {
                WidgetEntry(date: entryDate, hasInstances: !instances.isEmpty, hasContainers: hasContainers, selectedContainer: nil)
            }

            entries.append(entry)
        }

        return Timeline(entries: entries, policy: .atEnd)
    }

    private func getInstances() -> [Instance] {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
              let rawExistingInstances = sharedDefaults.data(forKey: instancesKey) else {
            return []
        }

        return (try? JSONDecoder().decode([Instance].self, from: rawExistingInstances)) ?? []
    }

    private func hasContainers() -> Bool {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName) else {
            return false
        }

        return sharedDefaults.bool(forKey: hasContainersKey)
    }
}

struct PourtainerWidget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { widget in
            if (!widget.hasInstances) {
                UnauthorizedEntryView()
                .containerBackground(Color("$background"), for: .widget)
            } else if (!widget.hasContainers) {
                EmptyEntryView()
                .containerBackground(Color("$background"), for: .widget)
            } else if (widget.selectedContainer == nil) {
                InvalidEntryView()
                .containerBackground(Color("$background"), for: .widget)
            } else {
                WidgetEntryView(selectedContainer: widget.selectedContainer!)
                    .containerBackground(Color("$background"), for: .widget)
            }
        }
        .supportedFamilies([.systemSmall])
    }
}

#Preview("Pourtainer Widget", as: .systemSmall) {
    PourtainerWidget()
} timeline: {
    WidgetEntry(date: .now, hasInstances: false, hasContainers: false, selectedContainer: nil)
    WidgetEntry(date: .now, hasInstances: true, hasContainers: false, selectedContainer: nil)
    WidgetEntry(date: .now, hasInstances: true, hasContainers: true, selectedContainer: nil)
    WidgetEntry(
        date: .now,
        hasInstances: true,
        hasContainers: true,
        selectedContainer: Container(Id: "1", Name: "Pourtainer", State: ContainerState(StartedAt: "", Status: "running"))
    )
    WidgetEntry(
        date: .now,
        hasInstances: true,
        hasContainers: true,
        selectedContainer: Container(Id: "1", Name: "Pourtainer", State: ContainerState(StartedAt: "", Status: "exited"))
    )
    WidgetEntry(
        date: .now,
        hasInstances: true,
        hasContainers: true,
        selectedContainer: Container(Id: "1", Name: "Pourtainer", State: ContainerState(StartedAt: "", Status: "unknown"))
    )
}
