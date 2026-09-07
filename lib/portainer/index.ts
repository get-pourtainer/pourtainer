// https://www.npmjs.com/package/openapi-typescript

import { throwOnError } from '@/lib/portainer/errors'
import type { paths } from '@/lib/portainer/paths'
import { usePersistedStore } from '@/stores/persisted'
import createClient from 'openapi-fetch'
import ReactNativeBlobUtil from 'react-native-blob-util'

export default function client({
    connectionId,
    accessDenied,
}: { connectionId?: string; accessDenied?: string } = {}) {
    const currentConnection = connectionId
        ? usePersistedStore.getState().connections.find((c) => c.id === connectionId)
        : usePersistedStore.getState().currentConnection

    if (!currentConnection) {
        throw new Error('No connection found')
    }

    const url = `${currentConnection.baseUrl}/api`

    // const newClient = createClient<paths>({
    //     baseUrl: url,
    //     headers: {
    //         'x-api-key': currentConnection.apiToken,
    //     },
    // })

    const newClient = createClient<paths>({
        baseUrl: url,
        fetch: async (input: Request) => {
            const fetcher = ReactNativeBlobUtil.config({
                trusty: true,
            })

            let body: null | string | object = null

            try {
                body = await input.json()

                // needed for file uploads
                if (!Array.isArray(body)) {
                    body = JSON.stringify(body)
                }
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

            if (__DEV__) {
                console.log(
                    'Portainer client -',
                    input.method,
                    input.url,
                    '->',
                    req.respInfo.status
                )
            }

            // The body is passed through on every status so the error
            // middleware can read the server's {message, details}
            const res = new Response(req.data, {
                status: req.respInfo.status,
                statusText: req.respInfo.state,
                headers: req.respInfo.headers,
            })

            return res
        },
    })

    // Rejects on any non-2xx response; a 403 on resource-controlled routes
    // carries the caller's message
    newClient.use(throwOnError({ accessDenied }))

    return newClient
}
