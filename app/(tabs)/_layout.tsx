import { fetchEndpoints } from '@/api/queries'
import { usePersistedStore } from '@/stores/persisted'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import Entypo from '@expo/vector-icons/Entypo'
import Feather from '@expo/vector-icons/Feather'
import { useQuery } from '@tanstack/react-query'
import { Tabs } from 'expo-router'
import { useEffect } from 'react'
import { useMemo } from 'react'
import { useUnistyles } from 'react-native-unistyles'

export default function TabLayout() {
    const { theme, rt } = useUnistyles()

    const currentConnection = usePersistedStore((state) => state.currentConnection)
    const switchEndpoint = usePersistedStore((state) => state.switchEndpoint)

    const currentEndpointId = useMemo(
        () => currentConnection?.currentEndpointId,
        [currentConnection]
    )

    const endpointsQuery = useQuery({
        queryKey: ['endpoints'],
        queryFn: fetchEndpoints,
    })

    useEffect(() => {
        // this is needed on first login, and when switching connections (not accounts/teams/workspaces)
        console.log('currentEndpointId', currentEndpointId)

        if (!endpointsQuery.data || endpointsQuery.data.length === 0) return

        if (!currentEndpointId) {
            for (const endpoint of endpointsQuery.data) {
                if (endpoint.Id) {
                    switchEndpoint(endpoint.Id.toString())
                    break
                }
            }
        }

        // sets a new endpoint if the user lost access to the current one
        if (
            endpointsQuery.data &&
            !endpointsQuery.data.find((endpoint) => endpoint.Id.toString() === currentEndpointId)
        ) {
            for (const endpoint of endpointsQuery.data) {
                if (endpoint.Id) {
                    switchEndpoint(endpoint.Id.toString())
                    break
                }
            }
        }
    }, [currentEndpointId, switchEndpoint, endpointsQuery.data])

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.background.list,
                    borderTopColor: theme.colors.primaryLight,
                    borderTopWidth: 1,
                    paddingBottom: rt.insets.bottom,
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
