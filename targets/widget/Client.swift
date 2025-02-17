import Foundation

struct Client: Decodable {
  let url: String
  let accessToken: String
  let endpointId: Int
}
