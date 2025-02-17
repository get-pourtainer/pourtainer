func getDockerContainer(id: String) async throws -> Container? {
  let params = FetchParams(method: HTTPMethod.GET, url: "/containers/\(id)/json")
  
  return try await httpRequest(params: params)
}
