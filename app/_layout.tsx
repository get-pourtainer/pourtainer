import { queryClient } from '@/lib/query'
import { storage } from '@/lib/storage'
import * as Sentry from '@sentry/react-native'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { isRunningInExpoGo } from 'expo'
import { Stack, useNavigationContainerRef } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { StatusBar } from 'react-native'
import Gesture from 'react-native-gesture-handler'
import Reanimated from 'react-native-reanimated'
import { UnistylesRuntime } from 'react-native-unistyles'

console.log(Gesture)
console.log(Reanimated)

const navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
    dsn: 'https://e22f4e095b63a18d2908414ca1a0b146@o4508503751983104.ingest.de.sentry.io/4508503798775888',
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
})

// const clearStorage = () => {
//     storage.clearAll()
//     queryClient.clear()
// }

const mmkvPersister = createSyncStoragePersister({
    storage: {
        getItem: (key) => {
            const value = storage.getString(key)
            return value === undefined ? null : value
        },
        setItem: (key, value) => {
            storage.set(key, value)
        },
        removeItem: (key) => {
            storage.delete(key)
        },
    },
})

function RootLayout() {
    // clearStorage()

    const theme = UnistylesRuntime.getTheme()

    const commonHeaderStyle = {
        headerStyle: {
            backgroundColor: theme.colors.background.list,
        },
        headerTintColor: theme.colors.text.white,
        headerShadowVisible: false,
    }

    const ref = useNavigationContainerRef()

    useEffect(() => {
        if (ref?.current) {
            navigationIntegration.registerNavigationContainer(ref)
        }
    }, [ref])

    useEffect(() => {
        SplashScreen.hide()
    }, [])

    return (
        <>
            <StatusBar barStyle="light-content" />

            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{
                    persister: mmkvPersister,
                    dehydrateOptions: {
                        shouldDehydrateQuery: (query) => query.state.data !== undefined,
                    },
                }}
            >
                <Stack>
                    <Stack.Screen
                        name="login/index"
                        options={{
                            headerShown: false,
                            gestureEnabled: false,
                            animation: 'none',
                        }}
                    />
                    <Stack.Screen
                        name="(tabs)"
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen name="container/[id]/index" options={commonHeaderStyle} />
                    <Stack.Screen
                        name="container/[id]/logs"
                        options={{
                            ...commonHeaderStyle,
                            title: 'Logs',
                        }}
                    />
                    <Stack.Screen
                        name="container/[id]/terminal"
                        options={{
                            ...commonHeaderStyle,
                            title: 'Terminal',
                        }}
                    />
                    <Stack.Screen
                        name="volume/[id]"
                        options={{
                            ...commonHeaderStyle,
                            animation: 'none',
                        }}
                    />
                </Stack>
            </PersistQueryClientProvider>
        </>
    )
}

export default Sentry.wrap(RootLayout)
