import { Stack } from 'expo-router'
import { useUnistyles } from 'react-native-unistyles'
import { Platform } from 'react-native'

export default function ContainersLayout() {
    const { theme } = useUnistyles()

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
                    title: 'Containers',
                }}
            />
        </Stack>
    )
}
