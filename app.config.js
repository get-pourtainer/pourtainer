module.exports = ({ config }) => {
    return {
        ...config,

        name: process.env.EXPO_PUBLIC_APP_NAME,
        slug: process.env.EXPO_PUBLIC_APP_SLUG,
        scheme: process.env.EXPO_PUBLIC_APP_SCHEME,
        version: process.env.EXPO_PUBLIC_APP_VERSION,
        owner: process.env.EXPO_PUBLIC_OWNER,

        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'dark',
        newArchEnabled: true,

        ios: {
            ...(config.ios || {}),
            appleTeamId: process.env.EXPO_PUBLIC_APPLE_TEAM_ID,
            bundleIdentifier: process.env.EXPO_PUBLIC_BUNDLE_IDENTIFIER,
            supportsTablet: true,
            config: {
                usesNonExemptEncryption: false,
            },
            infoPlist: {
                SKIncludeConsumableInAppPurchaseHistory: true,
                NSAppTransportSecurity: {
                    NSAllowsArbitraryLoads: true,
                },
            },
            entitlements: {
                'com.apple.security.application-groups': [process.env.EXPO_PUBLIC_WIDGET_GROUP],
            },
        },

        androidNavigationBar: {
            enforceContrast: false,
        },
        android: {
            ...(config.android || {}),
            package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE,
            adaptiveIcon: {
                foregroundImage: './assets/icon.png',
                backgroundColor: '#141414',
            },
            playStoreUrl: process.env.EXPO_PUBLIC_ANDROID_STORE_URL,
            predictiveBackGestureEnabled: false,
        },

        plugins: [
            [
                'expo-build-properties',
                {
                    ios: {
                        networkInspector: false,
                    },
                    android: {
                        minSdkVersion: 24,
                        targetSdkVersion: 35,
                        enablePngCrunchInReleaseBuilds: false,
                    },
                },
            ],
            './plugins/withAndroidHeap',
            'expo-router',
            [
                'expo-splash-screen',
                {
                    image: './assets/splash.png',
                    backgroundColor: '#141414',
                    imageWidth: 200,
                },
            ],
            'expo-asset',
            [
                '@sentry/react-native/expo',
                {
                    url: 'https://sentry.io/',
                    project: process.env.EXPO_PUBLIC_SENTRY_PROJECT,
                    organization: process.env.EXPO_PUBLIC_SENTRY_ORG,
                },
            ],
            './plugins/withBlobSelfSignedServer',
            '@bacons/apple-targets',
            'expo-quick-actions',
            [
                './plugins/withAndroidWidget',
                {
                    src: './targets/widget-android',
                    receiverName: 'ContainerWidgetReceiver',
                    versions: {
                        glance: '1.1.1',
                        kotlinExtension: '2.0.0',
                        gson: '2.13.2',
                        activityCompose: '1.11.0',
                        composeUi: '1.9.3',
                        material3: '1.4.0',
                        workRuntime: '2.10.5',
                    },
                },
            ],
            'expo-font',
            'expo-web-browser',
            [
                'expo-alternate-app-icons',
                [
                    {
                        name: 'BlackDark',
                        ios: './assets/icon-black-dark.png',
                        android: {
                            foregroundImage: './assets/icon-black-dark.png',
                        },
                    },
                    {
                        name: 'BlackLight',
                        ios: './assets/icon-black-light.png',
                        android: {
                            foregroundImage: './assets/icon-black-light.png',
                        },
                    },
                    {
                        name: 'BlueDark',
                        ios: './assets/icon-blue-dark.png',
                        android: {
                            foregroundImage: './assets/icon-blue-dark.png',
                        },
                    },
                    {
                        name: 'BlueLight',
                        ios: './assets/icon-blue-light.png',
                        android: {
                            foregroundImage: './assets/icon-blue-light.png',
                        },
                    },
                ],
            ],
        ],
        experiments: {
            typedRoutes: true,
        },
        extra: {
            router: {
                origin: false,
            },
            eas: {
                projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
            },
        },
    }
}
