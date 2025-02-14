struct Client {
    init() {
        url = nil
        accessToken = nil
    }

    init(_url: String?, _accessToken: String?) {
        url = _url
        accessToken = _accessToken
    }

    func isValid() -> Bool {
        guard let url = url, let accessToken = accessToken else {
            return false
        }

        return !url.isEmpty && !accessToken.isEmpty
    }

    let url: String?
    let accessToken: String?
}
