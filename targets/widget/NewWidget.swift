import WidgetKit
import SwiftUI
import AppIntents

// 1. New Intent
struct SelectCharacterIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Character"
    static var description = IntentDescription("Selects the character to display information for.")


    @Parameter(title: "Character")
    var character: CharacterDetail?


    init(character: CharacterDetail) {
        self.character = character
    }

    init() {}
}

// 2. New Intent tile
struct CharacterDetail: AppEntity {
    let id: String
    let avatar: String
    let healthLevel: Double
    let heroType: String
    let isAvailable = true

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Character"
    static var defaultQuery = CharacterQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(avatar) \(id)")
    }


    static let allCharacters: [CharacterDetail] = [
        CharacterDetail(id: "Power Panda", avatar: "🐼", healthLevel: 0.14, heroType: "Forest Dweller"),
        CharacterDetail(id: "Unipony", avatar: "🦄", healthLevel: 0.67, heroType: "Free Rangers"),
        CharacterDetail(id: "Spouty", avatar: "🐳", healthLevel: 0.83, heroType: "Deep Sea Goer")
    ]
}

// 3. Intent Query
struct CharacterQuery: EntityQuery {
    func entities(for identifiers: [CharacterDetail.ID]) async throws -> [CharacterDetail] {
        CharacterDetail.allCharacters.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [CharacterDetail] {
        CharacterDetail.allCharacters.filter { $0.isAvailable }
    }

    func defaultResult() async -> CharacterDetail? {
        try? await suggestedEntities().first
    }
}

// 4. Widget state
struct CharacterDetailEntry: TimelineEntry {
    let date: Date
    let detail: CharacterDetail?
}

// 5. Widget provider
let defaultCharacter = CharacterDetailEntry(date: .now, detail: CharacterDetail(id: "Power Panda", avatar: "🐼", healthLevel: 0.14, heroType: "Forest Dweller"))

struct NewProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> CharacterDetailEntry {
        defaultCharacter
    }

    func snapshot(for configuration: SelectCharacterIntent, in context: Context) async -> CharacterDetailEntry {
        defaultCharacter
    }

    func timeline(for configuration: SelectCharacterIntent, in context: Context) async -> Timeline<CharacterDetailEntry> {
        let entry = CharacterDetailEntry(date: Date(), detail: configuration.character)
        let timeline = Timeline(entries: [entry], policy: .never)

        return timeline
    }
}


// 6. Widget Definition
struct NewWidget: Widget {
    let kind: String = "NewWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectCharacterIntent.self, provider: NewProvider()) { entry in
            NewEntryView(avatar: entry.detail?.avatar ?? "🐼")
        }
          .configurationDisplayName("Second Widget")
          .description("This is the second widget.")
          .supportedFamilies([.systemSmall, .systemLarge])
    }
}

// 7. Widget View
struct NewEntryView: View {
    var avatar: String

    var body: some View {
        Text("Selected: \(avatar)")
    }
}
