import SwiftUI

/**
 * Generic entry view for displaying informational messages in the widget
 * Used for status messages, errors, and loading states
 * Provides a consistent appearance for all non-container widget states
 */
@MainActor
struct EntryView: View {
    var title: String
    var description: String
    
    private var backgroundColor: Color {
        if #available(iOS 26.0, *) {
          return Color.clear
        } else {
          return Color("$background")
        }
    }
  
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color("$text"))
            }
            Text(description)
                .font(.system(size: 14))
                .foregroundColor(Color("$text"))
        }
        .frame(
            maxWidth: .infinity, 
            maxHeight: .infinity, 
            alignment: .topLeading
        )
        .background(backgroundColor)
    }
}

/**
 * Component to display container status with appropriate color indicators
 * Green for running, red for exited, and yellow for other states
 */
@MainActor
struct ContainerStatusView: View {
    var status: String?

    /**
     * Determines color based on container status
     * @return Color corresponding to the status
     */
    private func getStatusColor() -> Color {
        switch status {
        case "running":
            return Color("$success")
        case "exited":
            return Color("$error")
        default:
            return Color("$warning")
        }
    }

    var body: some View {
        HStack(alignment: .center) {
            // Status indicator dot
            Circle()
                .frame(width: 5, height: 5)
                .foregroundColor(getStatusColor())
            // Status text (capitalized for better readability)
            Text((status ?? "unknown").capitalized)
                .font(.system(size: 13))
                .foregroundColor(Color("$text"))
        }
    }
}

/**
 * Widget view for displaying container information
 * Shows container name and status with appropriate styling
 * Main view displayed when a container is successfully loaded
 */
@MainActor
struct WidgetEntryView: View {
    var selectedContainer: Container
    var logLines: [LogLine]
    var connectionId: String?
    var endpointId: Int?
    
    // Access the widget family from the environment
    @Environment(\.widgetFamily) var family
    
    // Determine how many log lines to show based on widget size
    private var visibleLogLines: [LogLine] {
        if logLines.isEmpty {
            return []
        }
        
        switch family {
        case .systemLarge:
            return Array(logLines.suffix(10))
        case .systemMedium:
            return Array(logLines.suffix(6))
        default:
            return Array(logLines.suffix(4))
        }
    }
    
    private var backgroundColor: Color {
        if #available(iOS 26.0, *) {
          return Color.clear
        } else {
          return Color("$background")
        }
    }

    var body: some View {
		VStack(alignment: .leading, spacing: 4) {
			// Container status indicator (running, exited, etc.)
			ContainerStatusView(status: selectedContainer.State.Status)
			
			// Container name with truncation for long names
			Text(selectedContainer.Name)
				.font(.system(size: 16, weight: .bold))
				.foregroundColor(Color("$text"))
				.lineLimit(2)
				.truncationMode(.tail)
			
			// Display log lines if available
			if !visibleLogLines.isEmpty {
				VStack(alignment: .leading, spacing: 2) {
					ForEach(visibleLogLines) { logLine in
						Text(logLine.content)
							.font(.system(size: 12))
							.foregroundColor(Color("$text").opacity(0.7))
							.lineLimit(family == .systemLarge ? 2 : 1)
							.truncationMode(.tail)
					}
				}
				.padding(.top, 2)
			}
		}
        .frame(
            maxWidth: .infinity, 
            maxHeight: .infinity, 
            alignment: .topLeading
        )
        .background(backgroundColor)
        // Deep link to open the container details in the Pourtainer app
        .widgetURL(URL(string: "pourtainer://container//\(selectedContainer.Id)?connectionId=\(connectionId ?? "")&endpointId=\(endpointId ?? 0)"))
    }
}
