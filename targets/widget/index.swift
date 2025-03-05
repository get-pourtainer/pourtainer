import WidgetKit
import SwiftUI

/**
 * Main entry point for the Pourtainer widget bundle
 * Registers all available widgets with the operating system
 * Required to have the @main attribute marking it as the app entry point
 */
@main
struct ExportWidgets: WidgetBundle {
    var body: some Widget {
        // Register the container widget for monitoring individual containers
        ContainerWidget()
        
        // Register the Stack Containers widget for displaying containers in a stack
        StackContainersWidget()
    }
}

