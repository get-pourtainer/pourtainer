import ExpoModulesCore
import WidgetKit

public class WidgetKitModule: Module {
    let _groupName: String = "group.com.pourtainer.mobile"
    let _connectionsKey: String = "pourtainer::connections"
	let _isSubscribedKey: String = "pourtainer::subscribed"

    private func getConnections() -> [Connection] {
        guard let sharedDefaults = UserDefaults(suiteName: _groupName),
              let rawExistingConnections = sharedDefaults.data(forKey: _connectionsKey) else {
            return []
        }

        return (try? JSONDecoder().decode([Connection].self, from: rawExistingConnections)) ?? []
    }
	
	private func reloadWidgets() {
        if #available(iOS 16.0, *) {
            WidgetCenter.shared.invalidateConfigurationRecommendations()
        }
        
        WidgetCenter.shared.reloadAllTimelines()
    }

    public func definition() -> ModuleDefinition {
        Name("PourtainerWidgetKit")
		
		Function("setIsSubscribed") { (isSubscribed: Bool) -> Void in
            guard let sharedDefaults = UserDefaults(suiteName: _groupName) else { return }
            
            sharedDefaults.set(isSubscribed, forKey: _isSubscribedKey)
            
            self.reloadWidgets()
        }

        Function("getConnections") {
            return self.getConnections()
        }

        Function("addConnection") { (connection: Connection) in
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

                 self.reloadWidgets()
            } catch {
                // for now do nothing
            }
        }
		
		Function("removeConnection") { (id: String) in
            guard let sharedDefaults = UserDefaults(suiteName: _groupName) else { return }
            
            do {
                let connections = self.getConnections().filter { $0.id != id }
                let encodedConnections = try JSONEncoder().encode(connections)
                
                sharedDefaults.set(encodedConnections, forKey: _connectionsKey)
                
                self.reloadWidgets()
            }
        }

        Function("clearAllConnections") {
            guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
                return
            }

            sharedDefaults.removePersistentDomain(forName: _groupName)
            sharedDefaults.synchronize()

            self.reloadWidgets()
        }
    }
}

