import { useAuth } from '@/hooks/useAuth'
import { Redirect } from 'expo-router'

export default function App() {
    const { isAuthenticated, currentInstance } = useAuth()

    console.log('currentInstance', currentInstance)

    if (!isAuthenticated) {
        return <Redirect href="/login" />
    }

    return <Redirect href="/(tabs)/containers" />
}
