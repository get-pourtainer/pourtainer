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

export async function guestClient(
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

    try {
        const response = await ReactNativeBlobUtil.config({
            trusty: true,
        }).fetch(
            config.method || 'GET',
            fullUrl,
            headers,
            config.body ? JSON.stringify(config.body) : undefined
        )

        return response
    } catch (error) {
        console.error('Fetch error details:', {
            error,
            url: fullUrl,
            headers,
            method: config.method || 'GET',
        })
        throw error
    }
}
