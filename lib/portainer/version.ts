import { fetchSystemStatus } from '@/api/queries'
import { usePersistedStore } from '@/stores/persisted'
import { setTag } from '@sentry/react-native'
import { useEffect } from 'react'

// Keeps the current connection's Portainer version fresh (servers get upgraded)
// and tags Sentry events with it. Runs on app start and on every connection switch.
export function useSyncServerVersion() {
    const connectionId = usePersistedStore((state) => state.currentConnection?.id)
    const serverVersion = usePersistedStore((state) => state.currentConnection?.serverVersion)
    const setServerVersion = usePersistedStore((state) => state.setServerVersion)

    useEffect(() => {
        setTag('portainer_version', serverVersion ?? 'unknown')
    }, [serverVersion])

    useEffect(() => {
        if (!connectionId) return

        let cancelled = false

        fetchSystemStatus({ connectionId })
            .then((status) => {
                if (!cancelled && status.Version) {
                    setServerVersion(connectionId, status.Version)
                }
            })
            .catch((error) => {
                console.log('Could not refresh Portainer version', error)
            })

        return () => {
            cancelled = true
        }
    }, [connectionId, setServerVersion])
}
