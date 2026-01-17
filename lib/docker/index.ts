// https://www.npmjs.com/package/openapi-typescript

import type { paths } from '@/lib/docker/schema'
import { usePersistedStore } from '@/stores/persisted'
import createClient from 'openapi-fetch'
import ReactNativeBlobUtil from 'react-native-blob-util'

const IGNORE_BODY_URLS = ['images/create']

export default function client({
    connectionId,
    endpointId,
}: { connectionId?: string; endpointId: string }) {
    const currentConnection = connectionId
        ? usePersistedStore.getState().connections.find((c) => c.id === connectionId)
        : usePersistedStore.getState().currentConnection

    if (!currentConnection) {
        throw new Error('No connection found')
    }

    const url = `${currentConnection.baseUrl}/api/endpoints/${endpointId}/docker`

    const newClient = createClient<paths>({
        baseUrl: url,
        fetch: async (input: Request) => {
            const fetcher = ReactNativeBlobUtil.config({
                trusty: true,
            })

            let body: null | string = null

            try {
                body = await input.json()
                body = JSON.stringify(body)
            } catch {
                body = null
            }

            const headers: Record<string, string> = {}
            for (const [key, value] of input.headers) {
                headers[key] = value
            }

            const req = await fetcher.fetch(
                input.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
                input.url,
                {
                    ...headers,
                    'x-api-key': currentConnection.apiToken,
                },
                body ? body : undefined
            )

            const skipPayload = IGNORE_BODY_URLS.some((url) => input.url.includes(url))

            const returnBody =
                [200, 201, 204].includes(req.respInfo.status) && !skipPayload ? req.data : '{}'

            const res = new Response(returnBody, {
                status: req.respInfo.status,
                statusText: req.respInfo.state,
                headers: req.respInfo.headers,
            })

            return res
        },
    })

    return newClient
}
