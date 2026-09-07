import pRetry from 'p-retry'
import ReactNativeBlobUtil, { type FetchBlobResponse } from 'react-native-blob-util'

type RequestConfig = {
    method?:
        | 'POST'
        | 'GET'
        | 'DELETE'
        | 'PUT'
        | 'PATCH'
        | 'post'
        | 'get'
        | 'delete'
        | 'put'
        | 'patch'
    headers?: Record<string, string>
    body?: any
}

// Transient statuses worth retrying; definitive errors (401, 404) are not.
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])

class RetryableStatusError extends Error {
    readonly response: FetchBlobResponse

    constructor(response: FetchBlobResponse) {
        super(`Retryable HTTP status ${response.respInfo.status}`)
        this.response = response
    }
}

export default async function guestClient(
    baseUrl: string,
    path: string,
    apiToken?: string,
    config: RequestConfig = {}
): Promise<FetchBlobResponse> {
    const headers: Record<string, string> = config.headers || {}

    if (apiToken) {
        headers['x-api-key'] = apiToken
    }

    const fullUrl = `${baseUrl}${path}`
    const method = config.method || 'GET'
    const body = config.body ? JSON.stringify(config.body) : undefined

    try {
        return await pRetry(
            async () => {
                const response = await ReactNativeBlobUtil.config({
                    trusty: true,
                }).fetch(method, fullUrl, headers, body)

                if (RETRYABLE_STATUSES.has(response.respInfo.status)) {
                    throw new RetryableStatusError(response)
                }

                return response
            },
            {
                retries: 5,
                minTimeout: 250,
            }
        )
    } catch (error) {
        // Retries exhausted on an HTTP error: hand back the last response so
        // callers still see its status and body.
        if (error instanceof RetryableStatusError) return error.response

        console.error('Fetch error details:', {
            error,
            url: fullUrl,
            headers,
            method,
        })
        throw error
    }
}
