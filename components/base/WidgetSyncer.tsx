import WidgetKitModule from '@/modules/widgetkit'
import { usePersistedStore } from '@/stores/persisted'
import { useGlobalSearchParams } from 'expo-router'
import { useUser } from 'expo-superwall'
import type React from 'react'
import { useEffect, useMemo } from 'react'

type WidgetConnection = { id: string; url: string; accessToken: string }

export function WidgetSyncer({ children }: { children: React.ReactNode }) {
    const { subscriptionStatus } = useUser()
    const connections = usePersistedStore((state) => state.connections)
    const currentConnectionId = usePersistedStore((state) => state.currentConnection?.id)
    const currentEndpointId = usePersistedStore(
        (state) => state.currentConnection?.currentEndpointId
    )
    const switchConnection = usePersistedStore((state) => state.switchConnection)
    const { connectionId, endpointId } = useGlobalSearchParams<{
        connectionId?: string
        endpointId?: string
    }>()

    // Widget deep links carry the connection and endpoint they were created on.
    // Endpoint ids collide across servers, so both are compared together.
    useEffect(() => {
        if (!connectionId) return
        if (!connections.some((connection) => connection.id === connectionId)) return

        const sameConnection = connectionId === currentConnectionId
        const sameEndpoint = !endpointId || endpointId === currentEndpointId
        if (sameConnection && sameEndpoint) return

        // switchConnection resets the query cache itself
        switchConnection(endpointId ? { connectionId, endpointId } : { connectionId })
    }, [
        connectionId,
        endpointId,
        connections,
        currentConnectionId,
        currentEndpointId,
        switchConnection,
    ])

    useEffect(() => {
        if (subscriptionStatus.status === 'UNKNOWN') {
            return
        }
        WidgetKitModule.setIsSubscribed(__DEV__ || subscriptionStatus.status !== 'INACTIVE')
    }, [subscriptionStatus.status])

    // The native record expects {id, url, accessToken}; the module compares
    // the encoded payload itself and only reloads widgets when it changed.
    const widgetConnections = useMemo(
        () =>
            connections.map(
                (connection): WidgetConnection => ({
                    id: connection.id,
                    url: connection.baseUrl,
                    accessToken: connection.apiToken,
                })
            ),
        [connections]
    )

    useEffect(() => {
        WidgetKitModule.setConnections(widgetConnections)
    }, [widgetConnections])

    return <>{children}</>
}
