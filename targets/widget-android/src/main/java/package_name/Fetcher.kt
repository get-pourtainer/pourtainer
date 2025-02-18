package com.pourtainer.mobile

import java.net.HttpURLConnection
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import com.google.gson.Gson
import expo.modules.widgetkit.Client

enum class HTTPMethod(val value: String) {
    GET("GET"),
    POST("POST"),
    PUT("PUT"),
    PATCH("PATCH"),
    DELETE("DELETE")
}

data class FetchParams(val method: HTTPMethod, val url: String)

data class Client(
    val endpointId: String,
    val url: String,
    val accessToken: String
)

fun enableUnsafeSSL() {
    try {
        val trustAllCerts = arrayOf<TrustManager>(
            object : X509TrustManager {
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

suspend fun fetch(params: FetchParams, client: Client): ByteArray = withContext(Dispatchers.IO) {
    if (!params.url.startsWith("/")) {
        throw Exception("URL should start with /")
    }

    val path = "/api/endpoints/${client.endpointId}/docker${params.url}"
    val fullUrlString = client.url + path
    val url = URL(fullUrlString)

    enableUnsafeSSL()

    val connection = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = params.method.value
        setRequestProperty("Accept", "application/json")
        setRequestProperty("x-api-key", client.accessToken)
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

suspend inline fun <reified T> httpRequest(params: FetchParams, client: Client): T {
    val data = fetch(params, client)
    val json = String(data, Charsets.UTF_8)
    return Gson().fromJson(json, T::class.java)
}
