import SwiftUI

struct UnauthorizedEntryView: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text("Unauthorized")
            .font(.system(size: 16, weight: .bold))
            .foregroundColor(Color("$text"))
      }
      Text("Sign in with Pourtainer app")
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

struct EmptyEntryView: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text("No containers")
            .font(.system(size: 16, weight: .bold))
            .foregroundColor(Color("$text"))
      }
      Text("Add your first container in Pourtainer app")
          .font(.system(size: 14))
          .foregroundColor(Color("$text"))
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(Color("$background"))
  }
}

struct WidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
          ContainerStatusView(status: entry.status)
          Text(entry.configuration.container?.name ?? "Unnamed")
              .font(.system(size: 16, weight: .bold))
              .foregroundColor(Color("$text"))
              .lineLimit(3)
              .truncationMode(.tail)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color("$background"))
        .widgetURL(URL(string: "pourtainer://container/\(entry.configuration.container?.id ?? "")"))
    }
}
