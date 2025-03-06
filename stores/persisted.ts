import { queryClient } from '@/lib/query'
import { mmkvStorage } from '@/lib/storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// rename to CONNECTION
export interface Connection {
    id: string
    apiToken: string
    baseUrl: string
    currentEndpointId: string | null
}

interface PersistedState {
    connections: Connection[]
    currentConnection: Connection | null
    switchConnection: (connectionId: string) => void
    removeConnection: (connectionId: string) => void
    addConnection: (connection: Connection) => void
    switchEndpoint: (endpointId: string) => void

    countToReviewPrompt: number
    setCountToReviewPrompt: (count: number) => void
    lastShownReviewPrompt: number | null
    setLastShownReviewPrompt: (ts: number) => void
}

export const usePersistedStore = create<PersistedState>()(
    persist(
        (set, get) => ({
            connections: [],
            currentConnection: null,
            switchConnection: (connectionId: string) => {
                const connection = get().connections.find((c) => c.id === connectionId)
                if (!connection) return
                set({ currentConnection: connection })
            },
            removeConnection: (connectionId: string) => {
                const newConnections = get().connections.filter((c) => c.id !== connectionId)

                set({
                    connections: newConnections,
                    currentConnection: newConnections[0] || null,
                })
            },
            addConnection: ({ id, apiToken, baseUrl }: Connection) => {
                const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

                set((state) => ({
                    connections: [
                        ...state.connections,
                        {
                            id,
                            apiToken,
                            baseUrl: normalizedBaseUrl,
                            currentEndpointId: null,
                        },
                    ],
                }))
            },
            switchEndpoint: (endpointId: string) => {
                const state = get()

                const connection = state.connections.find(
                    (c) => c.id == state.currentConnection?.id
                )
                if (!connection) return

                const newConnection = {
                    ...connection,
                    currentEndpointId: endpointId,
                }

                const newConnections = state.connections.map((c) =>
                    c.id === newConnection.id ? newConnection : c
                )

                set({ connections: newConnections, currentConnection: newConnection })

                queryClient.invalidateQueries()
            },

            countToReviewPrompt: 12,
            setCountToReviewPrompt: (count: number) => {
                set({ countToReviewPrompt: count })
            },
            lastShownReviewPrompt: null,
            setLastShownReviewPrompt: (ts: number) => {
                set({ lastShownReviewPrompt: ts })
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => mmkvStorage),
            version: 1,
        }
    )
)
