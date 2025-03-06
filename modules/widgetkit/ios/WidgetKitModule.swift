import ExpoModulesCore
import WidgetKit

public class WidgetKitModule: Module {
    let _groupName: String = "group.com.pourtainer.mobile"
    let _connectionsKey: String = "pourtainer::connections"

    private func getConnections() -> [Connection] {
        guard let sharedDefaults = UserDefaults(suiteName: _groupName),
              let rawExistingConnections = sharedDefaults.data(forKey: _connectionsKey) else {
            return []
        }

        return (try? JSONDecoder().decode([Connection].self, from: rawExistingConnections)) ?? []
    }

    public func definition() -> ModuleDefinition {
        Name("PourtainerWidgetKit")

        Function("getConnections") {
            return self.getConnections()
        }

        Function("registerConnection") { (connection: Connection) in
            guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
                return
            }

            do {
                var connections = self.getConnections()

                // add or update Connection
                if let index = connections.firstIndex(where: { $0.id == connection.id }) {
                    connections[index] = connection
                } else {
                    connections.append(connection)
                }

                let encodedConnections = try JSONEncoder().encode(connections)

                sharedDefaults.set(encodedConnections, forKey: _connectionsKey)
                sharedDefaults.synchronize()

                if #available(iOS 16.0, *) {
                    WidgetCenter.shared.invalidateConfigurationRecommendations()
                }
                
                WidgetCenter.shared.reloadAllTimelines()
            } catch {
                // for now do nothing
            }
        }

        Function("clearAllConnections") {
            guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
                return
            }

            sharedDefaults.removePersistentDomain(forName: _groupName)
            sharedDefaults.synchronize()

            if #available(iOS 16.0, *) {
                WidgetCenter.shared.invalidateConfigurationRecommendations()
            }
            
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}

