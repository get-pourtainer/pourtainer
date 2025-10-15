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
                backgroundColor: '#0f172a',
            },
            // googleServicesFile: './google-services.json',
            playStoreUrl: process.env.EXPO_PUBLIC_ANDROID_STORE_URL,
            predictiveBackGestureEnabled: true,
        },

        plugins: [
            [
                'expo-build-properties',
                {
                    ios: {
                        networkInspector: false,
                    },
                    android: {
                        minSdkVersion: 26,
                    },
                },
            ],
            'expo-router',
            [
                'expo-splash-screen',
                {
                    image: './assets/splash/dark.png',
                    backgroundColor: '#0f172a',
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
            [
                './plugins/withAndroidWidget',
                {
                    src: './targets/widget-android',
                    glanceVersion: '1.1.1',
                    kotlinExtensionVersion: '1.5.15',
                    receiverName: 'ContainerWidgetReceiver',
                },
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
