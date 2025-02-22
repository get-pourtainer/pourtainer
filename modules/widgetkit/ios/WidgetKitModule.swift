import ExpoModulesCore
import WidgetKit

public class WidgetKitModule: Module {
    let _groupName: String = "group.com.pourtainer.mobile"
    let _instancesKey: String = "pourtainer::instances"

    private func getInstances() -> [Instance] {
        guard let sharedDefaults = UserDefaults(suiteName: _groupName),
              let rawExistingInstances = sharedDefaults.data(forKey: _instancesKey) else {
            return []
        }

        return (try? JSONDecoder().decode([Instance].self, from: rawExistingInstances)) ?? []
    }

    public func definition() -> ModuleDefinition {
        Name("PourtainerWidgetKit")

        Function("getInstances") {
            return self.getInstances()
        }

        Function("registerInstance") { (instance: Instance) in
            guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
                return
            }

            do {
                var instances = self.getInstances()

                // add or update instance
                if let index = instances.firstIndex(where: { $0.instanceId == instance.instanceId }) {
                    instances[index] = instance
                } else {
                    instances.append(instance)
                }

                let encodedInstances = try JSONEncoder().encode(instances)

                sharedDefaults.set(encodedInstances, forKey: _instancesKey)
                sharedDefaults.synchronize()

                WidgetCenter.shared.reloadAllTimelines()
            } catch {
                // for now do nothing
            }
        }

        Function("clearAllInstances") {
            guard let sharedDefaults = UserDefaults(suiteName: _groupName) else {
                return
            }

            sharedDefaults.removePersistentDomain(forName: _groupName)
            sharedDefaults.synchronize()

            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}

