import Foundation

// HTTP methods supported by the Pourtainer API fetcher
enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case PATCH = "PATCH"
    case DELETE = "DELETE"
}

// Parameters needed to perform an HTTP request to Pourtainer API
struct FetchParams {
    let method: HTTPMethod
    let url: String           // API endpoint path (must start with /)
    let connection: Connection
}

/// A non-2xx response. `body` is the server's error text when present.
struct HTTPError: Error, LocalizedError {
    let statusCode: Int
    let body: String?

    var isNotFound: Bool { statusCode == 404 }
    var errorDescription: String? { "HTTP \(statusCode)" }
}

struct RequestError: Error, LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

/**
 * Accepts the self-signed certificates typical of self-hosted Portainer, but
 * only for hosts the user configured and only for server-trust challenges.
 * Client-certificate or NTLM challenges fall through to the system default.
 */
final class SelfSignedSSLDelegate: NSObject, URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust,
              configuredHosts().contains(challenge.protectionSpace.host) else {
            completionHandler(.performDefaultHandling, nil)
            return
        }

        completionHandler(.useCredential, URLCredential(trust: trust))
    }

    private func configuredHosts() -> Set<String> {
        Set(loadConnections().compactMap { URL(string: $0.url)?.host })
    }
}

// One session for the whole extension; a session per request leaks
private let sharedSession: URLSession = {
    let configuration = URLSessionConfiguration.default
    configuration.timeoutIntervalForRequest = 15
    configuration.waitsForConnectivity = false
    return URLSession(configuration: configuration, delegate: SelfSignedSSLDelegate(), delegateQueue: nil)
}()

/**
 * Performs an HTTP request and returns the response body. Redirects, including
 * http -> https, are followed by URLSession.
 */
func fetch(params: FetchParams) async throws -> Data {
    guard params.url.hasPrefix("/") else {
        throw RequestError(message: "URL should start with /")
    }

    guard let fullUrl = URL(string: "\(params.connection.url)\(params.url)") else {
        throw RequestError(message: "Invalid URL")
    }

    var request = URLRequest(url: fullUrl)
    request.httpMethod = params.method.rawValue
    request.addValue("application/json", forHTTPHeaderField: "Accept")
    request.addValue(params.connection.accessToken, forHTTPHeaderField: "x-api-key")

    let (data, response) = try await sharedSession.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
        throw RequestError(message: "Invalid response")
    }

    guard (200...299).contains(httpResponse.statusCode) else {
        throw HTTPError(statusCode: httpResponse.statusCode, body: String(data: data, encoding: .utf8))
    }

    return data
}

func httpRequest<T: Decodable>(params: FetchParams) async throws -> T {
    let data = try await fetch(params: params)
    return try JSONDecoder().decode(T.self, from: data)
}

/// Only network failures and 5xx responses are worth another attempt.
private func isRetryable(_ error: Error) -> Bool {
    if error is CancellationError { return false }
    if let httpError = error as? HTTPError { return httpError.statusCode >= 500 }
    return true
}

/**
 * Retries with exponential backoff: baseDelay * 2^(attempt-1).
 */
func withRetry<T>(
    maxAttempts: Int = 3,
    baseDelay: TimeInterval = 1.0,
    _ operation: () async throws -> T
) async throws -> T {
    var attempts = 0
    var lastError: Error?

    while attempts < maxAttempts {
        do {
            try Task.checkCancellation()
            return try await operation()
        } catch {
            attempts += 1
            lastError = error

            if attempts >= maxAttempts || !isRetryable(error) {
                break
            }

            let delayNanoseconds = UInt64(baseDelay * pow(2.0, Double(attempts - 1)) * 1_000_000_000)
            try await Task.sleep(nanoseconds: delayNanoseconds)
        }
    }

    throw lastError ?? RequestError(message: "All retry attempts failed")
}

func httpRequestWithRetry<T: Decodable>(
    params: FetchParams,
    maxAttempts: Int = 3,
    baseDelay: TimeInterval = 1.0
) async throws -> T {
    try await withRetry(maxAttempts: maxAttempts, baseDelay: baseDelay) {
        try await httpRequest(params: params)
    }
}

func httpRequestRawData(params: FetchParams) async throws -> Data {
    try await fetch(params: params)
}

func httpRequestRawDataWithRetry(
    params: FetchParams,
    maxAttempts: Int = 3,
    baseDelay: TimeInterval = 1.0
) async throws -> Data {
    try await withRetry(maxAttempts: maxAttempts, baseDelay: baseDelay) {
        try await httpRequestRawData(params: params)
    }
}
