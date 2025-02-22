import Foundation
import WidgetKit

let appGroupName: String = "group.com.pourtainer.mobile"
let instancesKey: String = "pourtainer::instances"
let hasContainersKey: String = "pourtainer::hasContainers"

struct Instance: Decodable {
    let url: String
    let accessToken: String
    let instanceId: String
}

struct Endpoint: Decodable {
    let Id: Int

    // add more fields if necessary
}

struct RawContainer: Decodable {
    let Id: String
    let Names: [String]
    let Status: String
}

struct ContainerState: Decodable {
    let StartedAt: String
    let Status: String
}

struct Container: Decodable {
    let Id: String
    let Name: String
    let State: ContainerState

    // add more fields if necessary
}

// widget state
struct WidgetEntry: TimelineEntry {
    let date: Date
    let hasInstances: Bool
    let hasContainers: Bool
    let selectedContainer: Container?
}

// used for Xcode preview and as widget placeholder
let placeholderWidget: WidgetEntry = WidgetEntry(
    date: .now,
    hasInstances: true,
    hasContainers: true,
    selectedContainer: Container(Id: "1", Name: "Pourtainer", State: ContainerState(StartedAt: "", Status: "running"))
)
