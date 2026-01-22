import { queryClient } from '@/lib/query'
import WidgetKitModule from '@/modules/widgetkit'
import { usePersistedStore } from '@/stores/persisted'
import { useGlobalSearchParams } from 'expo-router'
import { useUser } from 'expo-superwall'
import type React from 'react'
import { useEffect } from 'react'

export function WidgetSyncer({ children }: { children: React.ReactNode }) {
    const { subscriptionStatus } = useUser()
    const connections = usePersistedStore((state) => state.connections)
    const currentConnection = usePersistedStore((state) => state.currentConnection)
    const switchConnection = usePersistedStore((state) => state.switchConnection)
    const { connectionId, endpointId } = useGlobalSearchParams<{
        connectionId?: string
        endpointId?: string
    }>()

    useEffect(() => {
        if (!connectionId) return
        if (endpointId && endpointId !== currentConnection?.currentEndpointId) {
            switchConnection({ connectionId, endpointId })
            queryClient.resetQueries()
        }
        if (connectionId && connectionId !== currentConnection?.id) {
            switchConnection({ connectionId })
            queryClient.resetQueries()
        }
    }, [connectionId, endpointId, currentConnection, switchConnection])

    useEffect(() => {
        if (subscriptionStatus.status === 'UNKNOWN') {
            return
        }
        WidgetKitModule.setIsSubscribed(__DEV__ || subscriptionStatus.status !== 'INACTIVE')
    }, [subscriptionStatus.status])

    useEffect(() => {
        WidgetKitModule.setConnections(connections)
    }, [connections])

    return <>{children}</>
}
