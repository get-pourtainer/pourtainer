import { useAuthStore } from '@/stores/auth'

export function useAuth() {
    const { instances, currentInstanceId } = useAuthStore()

    const currentInstance = instances.find((org) => org.id === currentInstanceId)
    const isAuthenticated = instances.length > 0

    return {
        instances,
        currentInstance,
        isAuthenticated,
    }
} 
