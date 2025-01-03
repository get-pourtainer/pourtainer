import { Stack } from 'expo-router'
import { UnistylesRuntime } from 'react-native-unistyles'

export default function VolumesLayout() {
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
                headerTintColor: theme.colors.text.white, // change the colors of the small header text
                // navigationBarColor: 'red',
                // headerSearchBarOptions: {
                //     placeholder: 'Search volumes...',
                //     autoCapitalize: 'none',
                //     hideWhenScrolling: true,
                //     barTintColor: 'white', // background of the search bar
                //     // tintColor: 'red', // caret and cancel button
                //     // textColor: 'green', // text color
                //     // hintTextColor: 'purple',
                //     textColor: 'dimgray',
                //     // headerIconColor: 'purple',
                //     // obscureBackground: false,
                // },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Volumes',
                }}
            />
        </Stack>
    )
} 