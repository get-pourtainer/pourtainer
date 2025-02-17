import ExpoModulesCore
import WidgetKit

public class WidgetKitModule: Module {
  public func definition() -> ModuleDefinition {
      let _groupName: String = "group.com.pourtainer.mobile"

      Name("PourtainerWidgetKit")

      Constants {
          return [
            "groupName": _groupName
          ]
      }

      Function("registerClient") { (client: Client) in
          guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
              return
          }
          
          do {
              let encodedData = try JSONEncoder().encode(client)

              sharedDefaults.set(encodedData, forKey: "client")
              sharedDefaults.synchronize()

              WidgetCenter.shared.reloadAllTimelines()

          } catch {
              // for now do nothing
          }
      }

      Function("registerContainers") { (containers: Array<ContainerSetting>) in
          guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
              return
          }

          do {
              let encodedData = try JSONEncoder().encode(containers)

              sharedDefaults.set(encodedData, forKey: "containers")
              sharedDefaults.synchronize()

              WidgetCenter.shared.reloadAllTimelines()

          } catch {
              // for now do nothing
          }
      }

      Function("hasClient") {
          guard let sharedDefaults = UserDefaults(suiteName: _groupName),
                let rawData = sharedDefaults.data(forKey: "client"),
                let _ = (try? JSONDecoder().decode(Client.self, from: rawData)) else {
              return false
          }

          return true
      }

      Function("clear") {
         guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
            return
         }

         sharedDefaults.removePersistentDomain(forName: _groupName)
         sharedDefaults.synchronize()

         WidgetCenter.shared.reloadAllTimelines()
      }
      
      Function("updateEndpointId") { (endpointId: Int) in
          guard let sharedDefaults = UserDefaults(suiteName: _groupName),
                let rawData = sharedDefaults.data(forKey: "client"),
                let client = (try? JSONDecoder().decode(Client.self, from: rawData)) else {
              return
          }
          
          client.endpointId = endpointId
          
          do {
              let encodedData = try JSONEncoder().encode(client)

              sharedDefaults.set(encodedData, forKey: "client")
              sharedDefaults.synchronize()

              WidgetCenter.shared.reloadAllTimelines()

          } catch {
              // for now do nothing
          }
      }
  }
}

