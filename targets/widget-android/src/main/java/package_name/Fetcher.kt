package com.pourtainer.mobile

import java.net.HttpURLConnection
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.delay
import java.io.ByteArrayOutputStream
import com.google.gson.Gson
import expo.modules.widgetkit.Connection
import kotlin.math.pow

enum class HTTPMethod(val value: String) {
    GET("GET"),
    POST("POST"),
    PUT("PUT"),
    PATCH("PATCH"),
    DELETE("DELETE")
}

data class FetchParams(
    val method: HTTPMethod,
    val url: String,
    val connection: Connection
)

fun enableUnsafeSSL() {
    try {
        val trustAllCerts = arrayOf<TrustManager>(
            object: X509TrustManager {
                override fun checkClientTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
                override fun checkServerTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
                override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = arrayOf()
            }
        )
        val sc = SSLContext.getInstance("SSL")

        sc.init(null, trustAllCerts, java.security.SecureRandom())
        HttpsURLConnection.setDefaultSSLSocketFactory(sc.socketFactory)
        HttpsURLConnection.setDefaultHostnameVerifier { _, _ -> true }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

suspend fun fetch(params: FetchParams): ByteArray = withContext(Dispatchers.IO) {
    if (!params.url.startsWith("/")) {
        throw Exception("URL should start with /")
    }

    val fullUrlString = params.connection.url + params.url
    val url = URL(fullUrlString)

    enableUnsafeSSL()

    val connection = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = params.method.value
        setRequestProperty("Accept", "application/json")
        setRequestProperty("x-api-key", params.connection.accessToken)
        connectTimeout = 15000
        readTimeout = 15000
    }

    try {
        connection.connect()
        val responseCode = connection.responseCode

        if (responseCode !in 200..299) {
            val errorMsg = connection.errorStream?.bufferedReader()?.use { it.readText() }
                ?: "HTTP Error: $responseCode"
            throw Exception("HTTP Error: $responseCode. $errorMsg")
        }

        connection.inputStream.use { input ->
            val buffer = ByteArrayOutputStream()
            val data = ByteArray(1024)
            var nRead: Int
            while (input.read(data, 0, data.size).also { nRead = it } != -1) {
                buffer.write(data, 0, nRead)
            }
            buffer.toByteArray()
        }
    } finally {
        connection.disconnect()
    }
}

/**
 * Generic HTTP request function that decodes JSON response to the specified type
 */
suspend inline fun <reified T> httpRequest(params: FetchParams): T {
    val data = fetch(params)
    val json = String(data, Charsets.UTF_8)

    return Gson().fromJson(json, T::class.java)
}

/**
 * Generic HTTP request function with automatic retry capability
 * Attempts the request multiple times with exponential backoff for transient failures
 * 
 * @param params Parameters for the HTTP request
 * @param maxAttempts Maximum number of retry attempts (default: 3)
 * @param baseDelay Base delay in seconds before retrying (default: 1.0)
 * @return Decoded object of type T
 * @throws Exception if all retry attempts fail
 */
suspend inline fun <reified T> httpRequestWithRetry(
    params: FetchParams,
    maxAttempts: Int = 3,
    baseDelay: Double = 1.0
): T {
    var attempts = 0
    var lastError: Exception? = null
    
    // Try up to maxAttempts times
    while (attempts < maxAttempts) {
        try {
            // Attempt the request
            return httpRequest(params)
        } catch (e: Exception) {
            attempts++
            lastError = e
            
            // Don't wait if this was our last attempt
            if (attempts >= maxAttempts) {
                break
            }
            
            // Don't retry certain error types
            if (e.message?.contains("HTTP Error: 401") == true || 
                e.message?.contains("HTTP Error: 403") == true ||
                e.message?.contains("HTTP Error: 400") == true || 
                e.message?.contains("HTTP Error: 404") == true) {
                break
            }
            
            // Calculate exponential backoff delay: baseDelay * 2^(attempts-1)
            val delayMillis = (baseDelay * 2.0.pow(attempts - 1) * 1000).toLong()
            
            // Wait before retrying
            delay(delayMillis)
        }
    }
    
    // If we get here, all attempts failed
    throw lastError ?: Exception("All retry attempts failed")
}

/**
 * Fetches raw data from an HTTP request without JSON decoding
 * Useful for endpoints that return non-JSON data like logs
 * 
 * @param params Parameters for the HTTP request
 * @return Raw ByteArray from the server response
 * @throws Exception if the request fails
 */
suspend fun httpRequestRawData(params: FetchParams): ByteArray {
    return fetch(params)
}

/**
 * Fetches raw data with automatic retry capability
 * Similar to httpRequestWithRetry but returns raw ByteArray instead of decoded JSON
 * 
 * @param params Parameters for the HTTP request
 * @param maxAttempts Maximum number of retry attempts (default: 3)
 * @param baseDelay Base delay in seconds before retrying (default: 1.0)
 * @return Raw ByteArray from the server response
 * @throws Exception if all retry attempts fail
 */
suspend fun httpRequestRawDataWithRetry(
    params: FetchParams,
    maxAttempts: Int = 3,
    baseDelay: Double = 1.0
): ByteArray {
    var attempts = 0
    var lastError: Exception? = null
    
    // Try up to maxAttempts times
    while (attempts < maxAttempts) {
        try {
            // Attempt the request
            return httpRequestRawData(params)
        } catch (e: Exception) {
            attempts++
            lastError = e
            
            // Don't wait if this was our last attempt
            if (attempts >= maxAttempts) {
                break
            }
            
            // Don't retry certain error types
            if (e.message?.contains("HTTP Error: 401") == true || 
                e.message?.contains("HTTP Error: 403") == true ||
                e.message?.contains("HTTP Error: 400") == true || 
                e.message?.contains("HTTP Error: 404") == true) {
                break
            }
            
            // Calculate exponential backoff delay
            val delayMillis = (baseDelay * 2.0.pow(attempts - 1) * 1000).toLong()
            
            // Wait before retrying
            delay(delayMillis)
        }
    }
    
    // If we get here, all attempts failed
    throw lastError ?: Exception("All retry attempts failed")
}
