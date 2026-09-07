import { useEnsureEndpoint } from '@/lib/portainer/endpoint'
import { useSyncServerVersion } from '@/lib/portainer/version'
import { COLORS } from '@/theme'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import Entypo from '@expo/vector-icons/Entypo'
import Feather from '@expo/vector-icons/Feather'
import { Tabs } from 'expo-router'
import { Platform, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TabLayout() {
    useSyncServerVersion()

    const { bottom: bottomInset } = useSafeAreaInsets()

    useEnsureEndpoint()

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.bgApp,
                    borderTopColor: COLORS.hr,
                    borderTopWidth: Platform.OS === 'ios' ? 1 : 0.2,
                    paddingTop: 8,
                    paddingBottom: 24,
                    height: 84,
                },
                tabBarActiveTintColor: COLORS.primaryLight,
                tabBarInactiveTintColor: COLORS.primaryDark,
                // The default button is a PlatformPressable with a themed ripple;
                // a plain Pressable without android_ripple has no press effect.
                tabBarButton: ({
                    android_ripple,
                    pressColor,
                    pressOpacity,
                    hoverEffect,
                    href,
                    ref,
                    ...props
                }) => <Pressable {...props} android_ripple={null} />,
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
