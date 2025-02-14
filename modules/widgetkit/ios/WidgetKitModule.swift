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

      Function("registerClient") { (url: String, accessToken: String) in
          guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
              return
          }

          sharedDefaults.set(url, forKey: "url")
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

      Function("getClient") {
          guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
              return [
                "url": "",
                "accessToken": ""
              ]
          }

          let url = sharedDefaults.string(forKey: "url") ?? ""
          let accessToken = sharedDefaults.string(forKey: "accessToken") ?? ""

          return [
            "url": url,
            "accessToken": accessToken
          ]
      }

      Function("getAvailableContainers") {
          guard let sharedDefaults = UserDefaults(suiteName: _groupName),
                let rawData = sharedDefaults.data(forKey: "containers") else {
              return []
          }

          let containers = (try? JSONDecoder().decode([ContainerSetting].self, from: rawData)) ?? []

          return containers.map { container in
              return [
                "id": container.id,
                "name": container.name
              ]
          }
      }

      Function("clear") {
         guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
            return
         }

         sharedDefaults.removePersistentDomain(forName: _groupName)
         sharedDefaults.synchronize()

         WidgetCenter.shared.reloadAllTimelines()
      }
  }
}

