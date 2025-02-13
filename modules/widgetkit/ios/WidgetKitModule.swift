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

      Function("registerAccessToken") { (accessToken: String) in
          guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
              return
          }

          sharedDefaults.set(accessToken, forKey: "accessToken")
          sharedDefaults.synchronize()

          WidgetCenter.shared.reloadAllTimelines()
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
      
      Function("getAccessToken") {
          guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
              return ""
          }
          
          return sharedDefaults.string(forKey: "accessToken") ?? ""
      }

      Function("getAvailableContainers") {
          guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
              return []
          }
          
          let rawContainers = sharedDefaults.string(forKey: "containers") ?? "[]"
          let containers = try? JSONDecoder().decode([ContainerSetting].self, from: rawContainers.data(using: .utf8) ?? Data())
          
          return containers ?? []
      }
  }
}

