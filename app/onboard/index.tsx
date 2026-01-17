import { usePersistedStore } from '@/stores/persisted'
import { COLORS } from '@/theme'
import { Ionicons } from '@expo/vector-icons'
import { type OnboardingFeature, OnboardingView } from 'expo-onboarding'
import { router } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'

const FEATURES: OnboardingFeature[] = [
    {
        title: 'Manage Portainer',
        description:
            'Operate stacks, browse volumes, and check on your containers using home screen widgets.',
        icon: () => <Ionicons name="server" size={42} color={COLORS.primary} />,
        systemImage: 'server.rack',
    },
    {
        title: 'Open Source',
        description:
            'You are using Open Source Software (OSS) crafted by container-loving people. Give it a star!',
        systemImage: 'star.fill',
        icon: () => <Ionicons name="star" size={42} color={COLORS.primary} />,
        links: [
            {
                sectionText: 'Give it a star!',
                sectionUrl: 'https://github.com/get-pourtainer/pourtainer',
            },
        ],
    },
    {
        title: 'Local Only',
        description:
            'Your data never leaves the app, this includes your API token which is locally stored.',
        icon: () => <Ionicons name="shield" size={42} color={COLORS.primary} />,
        systemImage: 'shield.fill',
    },
]

export default function OnboardScreen() {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: 'black',
                paddingTop: 100,
            }}
        >
            <OnboardingView
                features={FEATURES}
                icon={require('@/assets/icon.png')}
                appName="Pourtainer"
                tintColor={COLORS.primary}
                titleStyle={{}}
                featureTitleStyle={{
                    color: COLORS.text,
                }}
                featureDescriptionStyle={{
                    color: COLORS.textMuted,
                }}
                ButtonComponent={() => (
                    <TouchableOpacity
                        style={{
                            width: '100%',
                            maxWidth: '80%',
                            backgroundColor: COLORS.primary,
                            padding: 10,
                            borderRadius: 12.5,
                        }}
                        onPress={() => {
                            usePersistedStore.setState({ hasSeenOnboarding: true })
                            router.dismissTo('/')
                        }}
                    >
                        <Text
                            style={{
                                color: COLORS.text,
                                textAlign: 'center',
                                fontSize: 20,
                                fontWeight: 600,
                                paddingTop: 4,
                                paddingBottom: 6,
                            }}
                        >
                            Let's go
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    )
}
