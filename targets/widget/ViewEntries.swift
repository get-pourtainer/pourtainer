import SwiftUI

struct UnauthorizedEntryView: View {
  @Environment(\.colorScheme) var colorScheme
  
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text("Unauthorized")
            .font(.system(size: 16, weight: .bold))
            .foregroundColor(.black)
      }
      Text("Sign in with Pourtainer app")
          .font(.system(size: 14))
          .foregroundColor(.black)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(Color("$background"))
  }
}

struct EmptyEntryView: View {
  @Environment(\.colorScheme) var colorScheme
  
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text("No containers")
            .font(.system(size: 16, weight: .bold))
            .foregroundColor(.black)
      }
      Text("Add your first container in Pourtainer app")
          .font(.system(size: 14))
          .foregroundColor(.black)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(Color("$background"))
  }
}

struct WidgetEntryView : View {
    @Environment(\.colorScheme) var colorScheme
  
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .center) {
              Circle()
                .frame(width: 5, height: 5)
                .foregroundColor(Color("$success"))
              Text("Running")
                .font(.system(size: 13))
                .foregroundColor(.black)
            }
          Text(entry.configuration.container!.name)
              .font(.system(size: 16, weight: .bold))
              .foregroundColor(.black)
              .lineLimit(3)
              .truncationMode(.tail)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color("$background"))
    }
}
