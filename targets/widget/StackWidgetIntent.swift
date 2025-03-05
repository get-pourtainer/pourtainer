import AppIntents
import SwiftUI
import WidgetKit

/**
 * Represents a stack entity for selection in widget configuration
 * Includes stack name and instance/endpoint information
 */
struct StackEntity: AppEntity, Decodable {
    var id: String
    var name: String
    var containerCount: Int
    var instance: Instance
    var endpoint: Endpoint
    
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Stack"
    static var defaultQuery = StackQuery()
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(name)",
            subtitle: "\(endpoint.Name) (\(containerCount) containers)"
        )
    }
}

/**
 * Query to provide stack entities for selection
 * Presents available stacks from all endpoints and instances
 */
struct StackQuery: EntityQuery {
    /**
     * Fetches available stacks from all instances and endpoints
     * Updates the widget state based on the result
     * Filters out stacks with only 1 container and "Stackless" stacks
     *
     * @return Array of StackEntity objects to display in the widget configuration
     */
    func getSharedOptions() async throws -> Array<StackEntity> {
        // Set widget state to loading while fetching data
        setWidgetState(state: .loading)

        // Retrieve stored instances from UserDefaults
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
              let rawInstances = sharedDefaults.data(forKey: instancesKey) else {
            setWidgetState(state: .apiFailed)
            return []
        }

        // Decode the instances from JSON data
        let instances = (try? JSONDecoder().decode([Instance].self, from: rawInstances)) ?? []
        
        // No instances available
        if instances.isEmpty {
            setWidgetState(state: .apiFailed)
            return []
        }

        // Use the first instance for now
        let instance = instances[0]
        
        do {
            // Fetch endpoints using CacheManager
            let endpoints = try await CacheManager.shared.fetchCachedEndpoints(instance: instance)
            guard !endpoints.isEmpty else { 
                setWidgetState(state: .noContainers)
                return [] 
            }
            
            // Use first endpoint for now
            let endpoint = endpoints[0]
            
            // Get stacks with container counts
            let stacks = try await fetchStacksWithContainerCounts(instance: instance, endpoint: endpoint)
            
            // Filter out stacks with only 1 container and "Stackless" stacks
            let filteredStacks = stacks.filter { 
                $0.containerCount > 1 && $0.name != "Stackless" 
            }
            
            // Update widget state based on stack availability
            setWidgetState(state: filteredStacks.isEmpty ? .noContainers : .hasContainers)
            
            // Map to entities (only include stacks with more than 1 container and not "Stackless")
            return filteredStacks.map { stack in
                StackEntity(
                    id: stack.id,
                    name: stack.name,
                    containerCount: stack.containerCount,
                    instance: instance,
                    endpoint: endpoint
                )
            }
        } catch {
            print("Error fetching stacks: \(error.localizedDescription)")
            setWidgetState(state: .apiFailed)
            return []
        }
    }
    
    func entities(for identifiers: [String]) async throws -> [StackEntity] {
        return try await getSharedOptions().filter { identifiers.contains($0.id) }
    }
    
    func suggestedEntities() async throws -> [StackEntity] {
        return try await getSharedOptions()
    }
    
    /**
     * Returns the default entity to select in the widget configuration
     * If possible, provides a default stack to pre-select
     * 
     * @return First available StackEntity or nil if none found
     */
    func defaultResult() async -> StackEntity? {
        return try? await suggestedEntities().first
    }
    
    /**
     * Updates the widget state in UserDefaults
     * Used to track the widget configuration status
     *
     * @param state The new widget state
     */
    private func setWidgetState(state: WidgetIntentState) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupName) else {
            return
        }

        sharedDefaults.set(state.rawValue, forKey: widgetStateKey)
        sharedDefaults.synchronize()
    }
}

/**
 * Widget configuration intent for selecting a stack
 * Allows users to choose which stack to display in the widget
 */
struct StackConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Stack"
    static var description: IntentDescription = IntentDescription("Select a stack to monitor")
    
    @Parameter(title: "Stack")
    var stack: StackEntity?
} 
