import { fetchEndpoints } from '@/api/queries'
import { usePersistedStore } from '@/stores/persisted'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

// Keeps the active connection pointed at an endpoint it can actually see:
// picks the first endpoint after login, and moves off an endpoint the user
// lost access to. Switches at most once per endpoints response.
export function useEnsureEndpoint() {
    const connectionId = usePersistedStore((state) => state.currentConnection?.id)
    const currentEndpointId = usePersistedStore(
        (state) => state.currentConnection?.currentEndpointId
    )
    const switchConnection = usePersistedStore((state) => state.switchConnection)

    const endpointsQuery = useQuery({
        queryKey: ['endpoints'],
        queryFn: async () => await fetchEndpoints(),
        enabled: !!connectionId,
    })

    useEffect(() => {
        const endpoints = endpointsQuery.data
        if (!connectionId || !endpoints || endpoints.length === 0) return

        const stillAvailable = endpoints.some(
            (endpoint) => String(endpoint.Id) === currentEndpointId
        )
        if (stillAvailable) return

        const fallback = endpoints.find((endpoint) => endpoint.Id !== undefined)
        if (!fallback) return

        switchConnection({ connectionId, endpointId: String(fallback.Id) })
    }, [connectionId, currentEndpointId, endpointsQuery.data, switchConnection])

    return endpointsQuery
}
