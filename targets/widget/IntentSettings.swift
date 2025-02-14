import AppIntents

struct ContainerSetting: AppEntity, Decodable {
  static var defaultQuery = ContainerQuery()
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Select Container"
  
  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name) (\(id))")
  }
  
  let id: String
  let name: String
}

struct ContainerQuery: EntityQuery {
  func getSharedOptions() -> Array<ContainerSetting> {
    guard let sharedDefaults = UserDefaults(suiteName: APP_GROUP_NAME),
          let rawData = sharedDefaults.data(forKey: "containers") else {
        return []
    }

    let containers = (try? JSONDecoder().decode([ContainerSetting].self, from: rawData)) ?? []

    return containers
  }
  
  func entities(for identifiers: [ContainerSetting.ID]) async throws -> Array<ContainerSetting> {
    return getSharedOptions().filter { identifiers.contains($0.id) }
  }
    
  func suggestedEntities() async throws -> Array<ContainerSetting> {
    return getSharedOptions()
  }
    
  func defaultResult() async -> ContainerSetting? {
      return try? await suggestedEntities().first
  }
}
