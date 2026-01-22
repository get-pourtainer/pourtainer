import { queryClient } from '@/lib/query'
import { mmkvStorage } from '@/lib/storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface Connection {
    id: string
    apiToken: string
    baseUrl: string
    currentEndpointId: string | null
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

                set({
                    connections: newConnections,
                    currentConnection: newConnections[0] || null,
                })

                if (state.currentConnection?.id === connectionId) {
                    queryClient.resetQueries()
                }
            },
            addConnection: (connection: Connection) => {
                set((state) => ({
                    connections: [...state.connections, connection],
                }))
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
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => mmkvStorage),
            version: 1,
        }
    )
)
