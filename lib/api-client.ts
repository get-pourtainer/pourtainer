import { usePersistedStore } from '@/stores/persisted'
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

export async function apiClient(
    path: string,
    config: RequestConfig = {},
    isFileUpload: boolean = false
): Promise<FetchBlobResponse> {
    const currentConnection = usePersistedStore.getState().currentConnection

    if (!currentConnection) {
        throw new Error('No connection selected')
    }

    const headers: Record<string, string> = config.headers || {}

    headers['x-api-key'] = currentConnection.apiToken

    // console.log('headers', headers)

    const fullUrl = `${currentConnection.baseUrl}${path}`

    // const fullUrl = 'http://192.168.100.70:3000' + path

    console.log('fullUrl', fullUrl)

    try {
        const response = await ReactNativeBlobUtil.config({
            trusty: true,
        }).fetch(
            config.method || 'GET',
            fullUrl,
            headers,
            config.body ? (isFileUpload ? config.body : JSON.stringify(config.body)) : undefined
        )

        console.log('response', response)
        console.log('response status:', response.respInfo.status)
        console.log('response headers:', response.respInfo.headers)

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
