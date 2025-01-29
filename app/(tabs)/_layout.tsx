import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import Entypo from '@expo/vector-icons/Entypo'
import Feather from '@expo/vector-icons/Feather'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { UnistylesRuntime } from 'react-native-unistyles'

export default function TabLayout() {
    const theme = UnistylesRuntime.getTheme()

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.background.list,
                    borderTopColor: theme.colors.primaryLight,
                    borderTopWidth: 1,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
                    height: Platform.OS === 'ios' ? 84 : 64,
                },
                tabBarActiveTintColor: theme.colors.text.white,
                tabBarInactiveTintColor: theme.colors.tabInactive,
            }}
        >
            <Tabs.Screen
                name="containers"
                options={{
                    title: 'Containers',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'cube' : 'cube-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="volumes"
                options={{
                    title: 'Volumes',
                    tabBarIcon: ({ color, focused, size }) => {
                        if (focused) {
                            return <Entypo name="drive" size={size} color={color} />
                        }
                        return <Feather name="hard-drive" size={size} color={color} />
                    },
                }}
            />
            <Tabs.Screen
                name="images"
                options={{
                    title: 'Images',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'disc-sharp' : 'disc-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="networks"
                options={{
                    title: 'Networks',
                    tabBarIcon: ({ color, focused, size }) => (
                        <MaterialCommunityIcons
                            name={focused ? 'network' : 'network-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'settings' : 'settings-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    )
}
