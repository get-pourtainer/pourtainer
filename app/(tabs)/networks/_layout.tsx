import { COLORS } from '@/theme'
import { Stack } from 'expo-router'
import { Platform } from 'react-native'

export default function NetworksLayout() {
    return (
        <Stack
            screenOptions={{
                headerLargeTitle: true,
                headerTransparent: Platform.OS === 'ios',
                headerBlurEffect: 'regular',
                headerShadowVisible: true,
                headerLargeTitleStyle: {
                    color: COLORS.text,
                },
                headerTintColor: COLORS.text,
                headerStyle: {
                    backgroundColor: COLORS.bgApp,
                },
                contentStyle: {
                    backgroundColor: COLORS.bgApp,
                },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Networks',
                }}
            />
        </Stack>
    )
}
