import SwiftUI

struct EntryView: View {
    var title: String
    var description: String
  
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
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color("$background"))
    }
}

struct ContainerStatusView: View {
    var status: String?

    private func getStatusColor() -> Color {
        switch status {
        case "running": return Color("$success")
        case "exited": return Color("$error")
        default: return Color("$warning")
        }
    }

    var body: some View {
        HStack(alignment: .center) {
            Circle()
                .frame(width: 5, height: 5)
                .foregroundColor(getStatusColor())
            Text((status ?? "unknown").capitalized)
                .font(.system(size: 13))
                .foregroundColor(Color("$text"))
        }
    }
}

struct WidgetEntryView : View {
    var selectedContainer: Container

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ContainerStatusView(status: selectedContainer.State.Status)
            Text(selectedContainer.Name)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(Color("$text"))
                .lineLimit(3)
                .truncationMode(.tail)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color("$background"))
        .widgetURL(URL(string: "pourtainer://container/\(selectedContainer.Id)"))
    }
}
