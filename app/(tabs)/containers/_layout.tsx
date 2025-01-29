import { Stack } from 'expo-router'
import { useUnistyles } from 'react-native-unistyles'

export default function ContainersLayout() {
    const { theme } = useUnistyles()

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
                    title: 'Containers',
                }}
            />
        </Stack>
    )
}
