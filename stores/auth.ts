import { queryClient } from '@/lib/query'
import { mmkvStorage } from '@/lib/storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface Instance {
    id: string
    apiToken: string
    baseUrl: string
}

interface AuthState {
    instances: Instance[]
    currentInstanceId: string | null
    addInstance: (instance: Instance) => void
    switchInstance: (instanceId: string) => void
    removeInstance: (instanceId: string) => void
    /* Endpoints */
    currentEndpointId: string | null
    setCurrentEndpointId: (endpointId: string) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            instances: [],
            currentInstanceId: null,
            addInstance: ({ id, apiToken, baseUrl }: Instance) => {
                const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

                set((state) => ({
                    instances: [...state.instances, { id, apiToken, baseUrl: normalizedBaseUrl }],
                    currentInstanceId: state.currentInstanceId || id,
                }))
            },
            switchInstance: (instanceId: string) => {
                const state = get()
                if (state.instances.some((org) => org.id === instanceId)) {
                    set({ currentInstanceId: instanceId })
                }
            },
            removeInstance: (instanceId: string) => {
                set((state) => {
                    const newOrgs = state.instances.filter((org) => org.id !== instanceId)
                    return {
                        instances: newOrgs,
                        currentInstanceId:
                            state.currentInstanceId === instanceId
                                ? newOrgs[0]?.id || null
                                : state.currentInstanceId,
                    }
                })
            },
            currentEndpointId: null,
            setCurrentEndpointId: (endpointId: string) => {
                set({ currentEndpointId: endpointId })
                queryClient.invalidateQueries()
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
) 