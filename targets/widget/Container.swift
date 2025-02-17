struct ContainerState: Decodable {
  let StartedAt: String
  let Status: String
}

struct Container: Decodable {
  let Id: String
  let Name: String
  let State: ContainerState
  
  // add more fields if widget will have additional functionality
}
