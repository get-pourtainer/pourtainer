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
                headerLargeStyle: {
                    backgroundColor: COLORS.background.list,
                },
                headerLargeTitleStyle: {
                    color: COLORS.text.white,
                },
                headerStyle: {
                    backgroundColor: COLORS.background.list,
                },
                headerTintColor: COLORS.text.white,
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
