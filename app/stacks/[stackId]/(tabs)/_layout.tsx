import { COLORS } from '@/theme'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'

export default function StackTabsLayout() {
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
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Compose',
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
                name="environment"
                options={{
                    title: 'Environment',
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? 'key' : 'key-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    )
}
