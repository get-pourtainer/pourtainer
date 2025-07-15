import { COLORS } from '@/theme'
import { Stack } from 'expo-router'
import { Platform } from 'react-native'

export default function VolumesLayout() {
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
                // change the colors of the small header text
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
