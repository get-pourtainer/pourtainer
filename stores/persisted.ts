import { queryClient } from '@/lib/query'
import { mmkvStorage } from '@/lib/storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface Connection {
    id: string
    apiToken: string
    baseUrl: string
    currentEndpointId: string | null
    // Reported by /api/system/status; refreshed on app start and connection switch.
    serverVersion?: string
}

interface PersistedState {
    connections: Connection[]
    currentConnection: Connection | null
    switchConnection: (
        props:
            | {
                  connectionId: string
              }
            | {
                  connectionId: string
                  endpointId: string
              }
    ) => void
    removeConnection: (connectionId: string) => void
    addConnection: (connection: Connection) => void
    setServerVersion: (connectionId: string, serverVersion: string) => void
    // Full reset to first-install defaults (last connection removed)
    resetAll: () => void

    countToReviewPrompt: number
    setCountToReviewPrompt: (count: number) => void
    lastShownReviewPrompt: number | null
    setLastShownReviewPrompt: (ts: number) => void

    hasSeenOnboarding: boolean

    acknowledgments: {
        swipeLeftStack: boolean
    }
    acknowledge: (type: keyof PersistedState['acknowledgments']) => void

    installationTs: number
}

export const usePersistedStore = create<PersistedState>()(
    persist(
        (set, get) => ({
            connections: [],
            currentConnection: null,
            switchConnection: (
                props:
                    | {
                          connectionId: string
                          endpointId: string
                      }
                    | {
                          connectionId: string
                      }
            ) => {
                const state = get()

                const connection = state.connections.find((c) => c.id === props.connectionId)
                if (!connection) return

                const newConnection = {
                    ...connection,
                    currentEndpointId:
                        'endpointId' in props ? props.endpointId : connection.currentEndpointId,
                }

                const newConnections = state.connections.map((c) =>
                    c.id === newConnection.id ? newConnection : c
                )

                set({
                    connections: newConnections,
                    currentConnection: newConnection,
                })

                queryClient.resetQueries()
            },
            removeConnection: (connectionId: string) => {
                const state = get()

                const newConnections = state.connections.filter((c) => c.id !== connectionId)
                const removedCurrent = state.currentConnection?.id === connectionId

                // Only removing the active connection changes what is shown
                set({
                    connections: newConnections,
                    currentConnection: removedCurrent
                        ? newConnections[0] || null
                        : state.currentConnection,
                })

                if (removedCurrent) {
                    queryClient.resetQueries()
                }
            },
            addConnection: (connection: Connection) => {
                set((state) => ({
                    connections: [...state.connections, connection],
                }))
            },
            setServerVersion: (connectionId: string, serverVersion: string) => {
                set((state) => {
                    // Unchanged: keep the same state so nothing re-renders or re-persists
                    const known = state.connections.find((c) => c.id === connectionId)
                    const current = state.currentConnection
                    if (
                        known?.serverVersion === serverVersion &&
                        (current?.id !== connectionId || current.serverVersion === serverVersion)
                    ) {
                        return state
                    }

                    const connections = state.connections.map((c) =>
                        c.id === connectionId ? { ...c, serverVersion } : c
                    )
                    const currentConnection =
                        state.currentConnection?.id === connectionId
                            ? { ...state.currentConnection, serverVersion }
                            : state.currentConnection

                    return { connections, currentConnection }
                })
            },

            countToReviewPrompt: 12,
            setCountToReviewPrompt: (count: number) => {
                set({ countToReviewPrompt: count })
            },
            lastShownReviewPrompt: null,
            setLastShownReviewPrompt: (ts: number) => {
                set({ lastShownReviewPrompt: ts })
            },

            hasSeenOnboarding: false,

            acknowledgments: {
                swipeLeftStack: false,
            },
            acknowledge: (type: keyof PersistedState['acknowledgments']) => {
                set((state) => ({
                    acknowledgments: {
                        ...state.acknowledgments,
                        [type]: true,
                    },
                }))
            },

            installationTs: Date.now(),

            resetAll: () => {
                set({
                    connections: [],
                    currentConnection: null,
                    countToReviewPrompt: 12,
                    lastShownReviewPrompt: null,
                    hasSeenOnboarding: false,
                    acknowledgments: { swipeLeftStack: false },
                    installationTs: Date.now(),
                })
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => mmkvStorage),
            version: 1,
            // Repair a persisted state that has connections but no active one,
            // instead of doing it during render in app/index.tsx
            merge: (persisted, current) => {
                const merged = { ...current, ...(persisted as Partial<PersistedState>) }
                if (merged.connections.length > 0 && !merged.currentConnection) {
                    merged.currentConnection = merged.connections[0]
                }
                return merged
            },
        }
    )
)
