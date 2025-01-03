import { Stack } from 'expo-router'
import { UnistylesRuntime } from 'react-native-unistyles'

export default function ContainersLayout() {
    const theme = UnistylesRuntime.getTheme()

    return (
        <Stack
            screenOptions={{
                headerLargeTitle: true,
                headerTransparent: true,
                headerBlurEffect: 'regular',
                headerLargeStyle: {
                    backgroundColor: theme.colors.background.list,
                },
                headerLargeTitleStyle: {
                    color: theme.colors.text.white,
                },
                headerTintColor: theme.colors.text.white,
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Settings',
                }}
            />
        </Stack>
    )
}
