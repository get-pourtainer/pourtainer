import { WidgetSyncer } from '@/components/base/WidgetSyncer'
import { queryClient } from '@/lib/query'
import { mmkvStorage } from '@/lib/storage'
import { COLORS } from '@/theme'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import * as Sentry from '@sentry/react-native'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { isRunningInExpoGo } from 'expo'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { activateKeepAwakeAsync } from 'expo-keep-awake'
import { useQuickActionRouting } from 'expo-quick-actions/router'
import { Stack, useNavigationContainerRef } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { SuperwallProvider } from 'expo-superwall'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    environment: __DEV__ ? 'development' : 'production',
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
})

// const clearStorage = () => {
//     mmkvStorage.clearAll()
//     queryClient.clear()
// }

const mmkvPersister = createSyncStoragePersister({
    storage: mmkvStorage,
})

const commonHeaderStyle: NativeStackNavigationOptions = {
    headerLargeTitle: true,
    headerTransparent: Platform.OS === 'ios',
    headerBlurEffect: isLiquidGlassAvailable() ? undefined : 'regular',
    headerShadowVisible: true,
    headerStyle: isLiquidGlassAvailable()
        ? undefined
        : {
              backgroundColor: COLORS.bgApp,
          },
    headerTintColor: COLORS.text,
    headerLargeTitleStyle: {
        color: COLORS.text,
    },
}

const commonContentStyle: Pick<NativeStackNavigationOptions, 'contentStyle'> = {
    contentStyle: {
        backgroundColor: COLORS.bgApp,
    },
}

export const unstable_settings = {
    initialRouteName: 'index',
    // 'stacks/[stackId]/(tabs)': {
    //     initialRouteName: 'index',
    // },
}

function RootLayout() {
    useQuickActionRouting()
    const ref = useNavigationContainerRef()

    useEffect(() => {
        if (ref?.current) {
            navigationIntegration.registerNavigationContainer(ref)
        }
    }, [ref])

    useEffect(() => {
        SplashScreen.hide()
        activateKeepAwakeAsync()
    }, [])

    return (
        <SafeAreaProvider>
            <GestureHandlerRootView>
                <KeyboardProvider statusBarTranslucent={true} navigationBarTranslucent={true}>
                    <SuperwallProvider
                        apiKeys={{
                            ios: process.env.EXPO_PUBLIC_IOS_SUPERWALL_API_KEY,
                            android: process.env.EXPO_PUBLIC_ANDROID_SUPERWALL_API_KEY,
                        }}
                    >
                        <WidgetSyncer>
                            <PersistQueryClientProvider
                                client={queryClient}
                                persistOptions={{
                                    persister: mmkvPersister,
                                    dehydrateOptions: {
                                        shouldDehydrateQuery: (query) =>
                                            query.state.status !== 'pending' &&
                                            query.state.status !== 'error' &&
                                            query.state.data !== undefined,
                                    },
                                }}
                            >
                                <Stack>
                                    <Stack.Screen
                                        name="index"
                                        options={{
                                            title: '',
                                            headerShown: false,
                                            gestureEnabled: false,
                                            contentStyle: {
                                                backgroundColor: COLORS.bgApp,
                                            },
                                        }}
                                    />

                                    <Stack.Screen
                                        name="onboard/index"
                                        options={{
                                            headerShown: false,
                                            gestureEnabled: false,
                                            animation: 'none',
                                        }}
                                    />

                                    <Stack.Screen
                                        name="login/index"
                                        options={{
                                            title: 'Login',
                                            headerShown: false,
                                            presentation: 'modal',
                                            ...commonContentStyle,
                                            autoHideHomeIndicator: true,
                                        }}
                                    />
                                    <Stack.Screen
                                        name="(tabs)"
                                        options={{
                                            headerShown: false,
                                        }}
                                    />

                                    <Stack.Screen
                                        name="stacks/[stackId]/(tabs)"
                                        options={{
                                            title: 'Stack',
                                            headerShown: false,
                                            animation: 'fade',
                                            animationDuration: 120,
                                            animationMatchesGesture: true,
                                            ...commonContentStyle,
                                        }}
                                    />

                                    <Stack.Screen
                                        name="container/[id]/index"
                                        options={{
                                            title: 'Container',
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
                                            headerLargeTitle: !isLiquidGlassAvailable(), // ios 26 bug
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
                                        name="container/[id]/edit"
                                        options={{
                                            title: 'Edit',
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

                                    <Stack.Screen
                                        name="icons/index"
                                        options={{
                                            title: 'App Icon',
                                            ...commonHeaderStyle,
                                            ...commonContentStyle,
                                            autoHideHomeIndicator: true,
                                        }}
                                    />
                                </Stack>
                            </PersistQueryClientProvider>
                        </WidgetSyncer>
                    </SuperwallProvider>
                </KeyboardProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    )
}

export default Sentry.wrap(RootLayout)
