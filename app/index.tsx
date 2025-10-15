import WidgetKitModule from '@/modules/widgetkit'
import { usePersistedStore } from '@/stores/persisted'
import * as Sentry from '@sentry/react-native'
import Superwall from '@superwall/react-native-superwall'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { Alert } from 'react-native'

export default function App() {
    const { showPaywall } = useLocalSearchParams<{ showPaywall?: string }>()

    const hasSeenOnboarding = usePersistedStore((state) => state.hasSeenOnboarding)
    const connections = usePersistedStore((state) => state.connections)
    const currentConnection = usePersistedStore((state) => state.currentConnection)

    if (!hasSeenOnboarding) {
        return <Redirect href="/onboard" />
    }

    if (connections.length === 0) {
        return <Redirect href="/login" />
    }

    if (!currentConnection) {
		usePersistedStore.setState({ currentConnection: connections[0] })
		Sentry.captureException(new Error('Found connections but not current connection id.'))
    }

    if (showPaywall) {
        Superwall.shared
            .register({
                placement: 'TapWidget',
                feature: () => {
                    WidgetKitModule.setIsSubscribed(true)
                    Alert.alert(
                        'Congrats, you can now go to your homescreen and search for "Pourtainer" widgets'
                    )
                },
            })
            .catch((error) => {
                console.error('Error registering TapWidget', error)
                Alert.alert('Error', 'Something went wrong, please try again.')
            })
    }

    return <Redirect href="/(tabs)/containers" />
}
