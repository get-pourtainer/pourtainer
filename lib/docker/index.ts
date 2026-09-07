// https://www.npmjs.com/package/openapi-typescript

import type { paths } from '@/lib/docker/schema'
import { throwOnError } from '@/lib/portainer/errors'
import { usePersistedStore } from '@/stores/persisted'
import createClient from 'openapi-fetch'
import ReactNativeBlobUtil from 'react-native-blob-util'

export default function client({
    connectionId,
    endpointId,
    accessDenied,
}: { connectionId?: string; endpointId: string; accessDenied?: string }) {
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

            // The body is passed through on every status so the error
            // middleware can read Docker's {message}
            const res = new Response(req.data, {
                status: req.respInfo.status,
                statusText: req.respInfo.state,
                headers: req.respInfo.headers,
            })

            return res
        },
    })

    // Rejects on any non-2xx response. 304 is Docker's "already started /
    // stopped", not a failure.
    newClient.use(throwOnError({ allow: [304], accessDenied }))

    return newClient
}
