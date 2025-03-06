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
    let method: HTTPMethod  // HTTP method to use (GET, POST, etc.)
    let url: String         // API endpoint path (must start with /)
    let connection: Connection  // Connection containing server URL and authentication information
}

/**
 * Delegate class to handle self-signed SSL certificates
 * This allows the app to connect to servers with self-signed certificates
 */
class SelfSignedSSLDelegate: NSObject, URLSessionDelegate {
    public func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        // Accept the server trust and proceed with the connection
        let urlCredential = URLCredential(trust: challenge.protectionSpace.serverTrust!)
        completionHandler(.useCredential, urlCredential)
    }
}

/**
 * Performs an HTTP request using the provided parameters
 * 
 * @param params Parameters for the HTTP request (method, URL, authentication)
 * @param completion Callback with the result (Data on success or Error on failure)
 */
private func fetch(params: FetchParams, completion: @escaping (Result<Data, Error>) -> Void) {
    // Validate URL format - must start with /
    if (!params.url.starts(with: "/")) {
        return completion(.failure(
            NSError(
                domain: "InvalidUrl", 
                code: 0, 
                userInfo: [NSLocalizedDescriptionKey: "URL should start with /"]
            )
        ))
    }

    // Build the full URL by combining connection URL and endpoint path
    let fullUrlString = "\(params.connection.url)\(params.url)"

    guard let fullUrl = URL(string: fullUrlString) else {
        return completion(.failure(
            NSError(
                domain: "InvalidURL", 
                code: 0, 
                userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]
            )
        ))
    }

    // Configure the request with required headers and authentication
    var request = URLRequest(url: fullUrl)
    request.httpMethod = params.method.rawValue
    request.addValue("application/json", forHTTPHeaderField: "Accept")
    request.addValue(params.connection.accessToken, forHTTPHeaderField: "x-api-key")

    // Create session with SSL delegate for self-signed certificates
    let session = URLSession(
        configuration: .default, 
        delegate: SelfSignedSSLDelegate(), 
        delegateQueue: OperationQueue.main
    )

    // Execute the request and handle the response
    let task = session.dataTask(with: request) { data, response, error in
        // Handle connection error (network issues, timeouts, etc.)
        if let error = error {
            completion(.failure(error))
            return
        }

        // Validate HTTP response
        guard let httpResponse = response as? HTTPURLResponse else {
            return completion(.failure(
                NSError(
                    domain: "InvalidResponse", 
                    code: 0, 
                    userInfo: [NSLocalizedDescriptionKey: "Invalid response"]
                )
            ))
        }

        // Handle HTTP error status codes (non-2xx responses)
        if !(200...299).contains(httpResponse.statusCode) {
            let error = NSError(
                domain: "HTTPError", 
                code: httpResponse.statusCode, 
                userInfo: [NSLocalizedDescriptionKey: "HTTP Error: \(httpResponse.statusCode)"]
            )

            // Log error response body for debugging
            if let data = data, let errorString = String(data: data, encoding: .utf8) {
                print("Error Response Body: \(errorString)")
            }

            return completion(.failure(error))
        }

        // Ensure data was received in the response
        guard let data = data else {
            return completion(.failure(
                NSError(
                    domain: "NoData", 
                    code: 0, 
                    userInfo: [NSLocalizedDescriptionKey: "No data received"]
                )
            ))
        }

        completion(.success(data))
    }

    task.resume()
}

/**
 * Generic HTTP request function that decodes JSON response to the specified type
 * Provides modern Swift async/await interface over the completion handler pattern
 * 
 * @param params Parameters for the HTTP request
 * @return Decoded object of type T
 * @throws Error if the request fails or response cannot be decoded
 */
func httpRequest<T: Decodable>(params: FetchParams) async throws -> T {
    try await withCheckedThrowingContinuation { continuation in
        fetch(params: params) { result in
            switch result {
            case .success(let data):
                do {
                    let decoder = JSONDecoder()
                    let decodedResult = try decoder.decode(T.self, from: data)
                    continuation.resume(returning: decodedResult)
                } catch {
                    continuation.resume(throwing: error)
                }
            case .failure(let error):
                continuation.resume(throwing: error)
            }
        }
    }
}

/**
 * Generic HTTP request function with automatic retry capability
 * Attempts the request multiple times with exponential backoff for transient failures
 * This helps improve reliability over unstable networks
 * 
 * @param params Parameters for the HTTP request
 * @param maxAttempts Maximum number of retry attempts (default: 3)
 * @param baseDelay Base delay in seconds before retrying (default: 1.0)
 * @return Decoded object of type T
 * @throws Error if all retry attempts fail
 */
func httpRequestWithRetry<T: Decodable>(
    params: FetchParams,
    maxAttempts: Int = 3,
    baseDelay: TimeInterval = 1.0
) async throws -> T {
    var attempts = 0
    var lastError: Error?
    
    // Try up to maxAttempts times
    while attempts < maxAttempts {
        do {
            // Check for task cancellation
            try Task.checkCancellation()
            
            // Attempt the request
            return try await httpRequest(params: params)
        } catch {
            attempts += 1
            lastError = error
            
            // Don't wait if this was our last attempt
            if attempts >= maxAttempts {
                break
            }
            
            // Check for certain error types that shouldn't be retried
            let nsError = error as NSError
            
            // Don't retry authentication or permission errors
            if nsError.domain == "HTTPError" && (nsError.code == 401 || nsError.code == 403) {
                break
            }
            
            // Don't retry bad requests or not found errors
            if nsError.domain == "HTTPError" && (nsError.code == 400 || nsError.code == 404) {
                break
            }
            
            // Calculate exponential backoff delay: baseDelay * 2^(attempts-1)
            // e.g., with baseDelay=1: 1s, 2s, 4s, etc.
            let delayNanoseconds = UInt64(baseDelay * pow(2.0, Double(attempts-1)) * 1_000_000_000)
            
            // Wait before retrying
            try await Task.sleep(nanoseconds: delayNanoseconds)
        }
    }
    
    // If we get here, all attempts failed
    throw lastError ?? NSError(
        domain: "RetryFailed", 
        code: 0, 
        userInfo: [NSLocalizedDescriptionKey: "All retry attempts failed"]
    )
}

/**
 * Fetches raw data from an HTTP request without JSON decoding
 * Useful for endpoints that return non-JSON data like logs
 * 
 * @param params Parameters for the HTTP request
 * @return Raw Data from the server response
 * @throws Error if the request fails
 */
func httpRequestRawData(params: FetchParams) async throws -> Data {
    try await withCheckedThrowingContinuation { continuation in
        fetch(params: params) { result in
            switch result {
            case .success(let data):
                continuation.resume(returning: data)
            case .failure(let error):
                continuation.resume(throwing: error)
            }
        }
    }
}

/**
 * Fetches raw data with automatic retry capability
 * Similar to httpRequestWithRetry but returns raw Data instead of decoded JSON
 * 
 * @param params Parameters for the HTTP request
 * @param maxAttempts Maximum number of retry attempts (default: 3)
 * @param baseDelay Base delay in seconds before retrying (default: 1.0)
 * @return Raw Data from the server response
 * @throws Error if all retry attempts fail
 */
func httpRequestRawDataWithRetry(
    params: FetchParams,
    maxAttempts: Int = 3,
    baseDelay: TimeInterval = 1.0
) async throws -> Data {
    var attempts = 0
    var lastError: Error?
    
    // Try up to maxAttempts times
    while attempts < maxAttempts {
        do {
            // Check for task cancellation
            try Task.checkCancellation()
            
            // Attempt the request
            return try await httpRequestRawData(params: params)
        } catch {
            attempts += 1
            lastError = error
            
            // Don't wait if this was our last attempt
            if attempts >= maxAttempts {
                break
            }
            
            // Check for certain error types that shouldn't be retried
            let nsError = error as NSError
            
            // Don't retry authentication or permission errors
            if nsError.domain == "HTTPError" && (nsError.code == 401 || nsError.code == 403) {
                break
            }
            
            // Don't retry bad requests or not found errors
            if nsError.domain == "HTTPError" && (nsError.code == 400 || nsError.code == 404) {
                break
            }
            
            // Calculate exponential backoff delay: baseDelay * 2^(attempts-1)
            let delayNanoseconds = UInt64(baseDelay * pow(2.0, Double(attempts-1)) * 1_000_000_000)
            
            // Wait before retrying
            try await Task.sleep(nanoseconds: delayNanoseconds)
        }
    }
    
    // If we get here, all attempts failed
    throw lastError ?? NSError(
        domain: "RetryFailed", 
        code: 0, 
        userInfo: [NSLocalizedDescriptionKey: "All retry attempts failed"]
    )
}
