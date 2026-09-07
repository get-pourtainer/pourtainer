package com.pourtainer.mobile

import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
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

/** A non-2xx response; `body` is the server's error text (Docker/Portainer JSON). */
class HttpException(val code: Int, val body: String) : Exception("HTTP $code: $body") {
    val isNotFound: Boolean get() = code == 404
}

private const val MAX_REDIRECTS = 5

/**
 * Self-signed certificates are the norm for self-hosted Portainer, matching the
 * app's own trust-all fetcher. Applied per connection, never as the process default.
 */
private val trustAllSocketFactory: SSLSocketFactory by lazy {
    val trustAll = arrayOf<TrustManager>(object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
        override fun checkServerTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
        override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = arrayOf()
    })
    SSLContext.getInstance("TLS").apply { init(null, trustAll, java.security.SecureRandom()) }.socketFactory
}

private val trustAllHostnameVerifier = HostnameVerifier { _, _ -> true }

private fun fetchBlocking(params: FetchParams): ByteArray {
    require(params.url.startsWith("/")) { "URL should start with /" }

    var target = URL(params.connection.url + params.url)
    var redirects = 0

    while (true) {
        val connection = (target.openConnection() as HttpURLConnection).apply {
            requestMethod = params.method.value
            // HttpURLConnection never follows a cross-scheme redirect; handled below
            instanceFollowRedirects = false
            setRequestProperty("Accept", "application/json")
            setRequestProperty("x-api-key", params.connection.accessToken ?: "")
            connectTimeout = 15000
            readTimeout = 15000
            (this as? HttpsURLConnection)?.let {
                it.sslSocketFactory = trustAllSocketFactory
                it.hostnameVerifier = trustAllHostnameVerifier
            }
        }

        try {
            connection.connect()
            val code = connection.responseCode

            if (code in 300..399) {
                val location = connection.getHeaderField("Location")
                if (location == null || redirects >= MAX_REDIRECTS) {
                    throw HttpException(code, "Redirect without a usable location")
                }
                target = URL(target, location)
                redirects++
                continue
            }

            if (code !in 200..299) {
                val body = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
                throw HttpException(code, body)
            }

            return connection.inputStream.use { input ->
                val buffer = ByteArrayOutputStream()
                val chunk = ByteArray(4096)
                var read: Int
                while (input.read(chunk).also { read = it } != -1) {
                    buffer.write(chunk, 0, read)
                }
                buffer.toByteArray()
            }
        } finally {
            connection.disconnect()
        }
    }
}

suspend fun fetch(params: FetchParams): ByteArray = withContext(Dispatchers.IO) { fetchBlocking(params) }

suspend inline fun <reified T> httpRequest(params: FetchParams): T {
    val data = fetch(params)
    return Gson().fromJson(String(data, Charsets.UTF_8), T::class.java)
}

/** Only network failures and 5xx are worth another attempt. */
fun isRetryable(error: Exception): Boolean = error !is HttpException || error.code >= 500

suspend fun <T> withRetry(maxAttempts: Int = 3, baseDelay: Double = 1.0, block: suspend () -> T): T {
    var attempts = 0
    var lastError: Exception? = null

    while (attempts < maxAttempts) {
        try {
            return block()
        } catch (e: Exception) {
            attempts++
            lastError = e
            if (attempts >= maxAttempts || !isRetryable(e)) break
            delay((baseDelay * 2.0.pow(attempts - 1) * 1000).toLong())
        }
    }

    throw lastError ?: Exception("All retry attempts failed")
}

suspend inline fun <reified T> httpRequestWithRetry(
    params: FetchParams,
    maxAttempts: Int = 3,
    baseDelay: Double = 1.0
): T = withRetry(maxAttempts, baseDelay) { httpRequest<T>(params) }

suspend fun httpRequestRawData(params: FetchParams): ByteArray = fetch(params)

suspend fun httpRequestRawDataWithRetry(
    params: FetchParams,
    maxAttempts: Int = 3,
    baseDelay: Double = 1.0
): ByteArray = withRetry(maxAttempts, baseDelay) { httpRequestRawData(params) }
