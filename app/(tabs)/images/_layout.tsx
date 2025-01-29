import { Stack } from 'expo-router'
import { UnistylesRuntime } from 'react-native-unistyles'
import { Platform } from 'react-native'

export default function ImagesLayout() {
    const theme = UnistylesRuntime.getTheme()

    return (
        <Stack
            screenOptions={{
                headerLargeTitle: true,
                headerTransparent: Platform.OS === 'ios',
                headerBlurEffect: 'regular',
                headerLargeStyle: {
                    backgroundColor: theme.colors.background.list,
                },
                headerLargeTitleStyle: {
                    color: theme.colors.text.white,
                },
                headerStyle: {
                    backgroundColor: theme.colors.background.list
                },
                headerTintColor: theme.colors.text.white
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Images',
                }}
            />
        </Stack>
    )
}
