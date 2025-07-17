import { queryClient } from '@/lib/query'
import { storage } from '@/lib/storage'
import { COLORS } from '@/theme'
import * as Sentry from '@sentry/react-native'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { isRunningInExpoGo } from 'expo'
import { Stack, useNavigationContainerRef } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { SystemBars } from 'react-native-edge-to-edge'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'

const navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
    dsn: 'https://e22f4e095b63a18d2908414ca1a0b146@o4508503751983104.ingest.de.sentry.io/4508503798775888',
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    environment: __DEV__ ? 'development' : 'production',
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

const commonHeaderStyle = {
    headerTransparent: Platform.OS === 'ios',
    headerStyle: {
        backgroundColor: COLORS.bgApp,
    },
    headerTintColor: COLORS.text,
    headerShadowVisible: true,
    headerLargeTitleStyle: {
        color: COLORS.text,
    },
    elevation: 0,
}

const commonContentStyle = {
    contentStyle: {
        backgroundColor: COLORS.bgApp,
    },
}

function RootLayout() {
    // clearStorage()
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
        <GestureHandlerRootView>
            <KeyboardProvider>
                <SystemBars />
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
                        <Stack.Screen name="index" options={{ headerShown: false }} />
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
                        <Stack.Screen
                            name="container/[id]/index"
                            options={{
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                            }}
                        />
                        <Stack.Screen
                            name="container/[id]/logs"
                            options={{
                                title: 'Logs',
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                            }}
                        />
                        <Stack.Screen
                            name="container/[id]/terminal"
                            options={{
                                title: 'Terminal',
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                            }}
                        />
                        <Stack.Screen
                            name="volume/[id]"
                            options={{
                                ...commonHeaderStyle,
                                ...commonContentStyle,
                                animation: 'none',
                            }}
                        />
                    </Stack>
                </PersistQueryClientProvider>
            </KeyboardProvider>
        </GestureHandlerRootView>
    )
}

export default Sentry.wrap(RootLayout)
