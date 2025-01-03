import { useAuthStore } from '@/stores/auth'
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
    const { instances, currentInstanceId } = useAuthStore.getState()
    const currentInstance = instances.find((instance) => instance.id === currentInstanceId)

    // console.log('currentInstance', currentInstance)

    if (!currentInstance) {
        throw new Error('No instance selected')
    }

    const headers: Record<string, string> = config.headers || {}

    headers['x-api-key'] = currentInstance.apiToken

    // console.log('headers', headers)

    const fullUrl = `${currentInstance.baseUrl}${path}`

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
