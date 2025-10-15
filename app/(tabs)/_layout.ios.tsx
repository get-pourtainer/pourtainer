import { fetchEndpoints } from '@/api/queries'
import { usePersistedStore } from '@/stores/persisted'
import { COLORS } from '@/theme'
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs'
import { useEffect } from 'react'
import { useMemo } from 'react'

export default function TabLayout() {
    const currentConnection = usePersistedStore((state) => state.currentConnection)
    const switchConnection = usePersistedStore((state) => state.switchConnection)

    const currentEndpointId = useMemo(
        () => currentConnection?.currentEndpointId,
        [currentConnection]
    )

    const endpointsQuery = useQuery({
        queryKey: ['endpoints'],
        queryFn: async () => await fetchEndpoints(),
    })

    useEffect(() => {
        // this is needed on first login, and when switching connections (not accounts/teams/workspaces)
        console.log('currentEndpointId', currentEndpointId)

        if (!endpointsQuery.data || endpointsQuery.data.length === 0) return

        if (!currentConnection?.id) return

        if (!currentEndpointId) {
            for (const endpoint of endpointsQuery.data) {
                if (endpoint.Id) {
                    switchConnection({
                        connectionId: currentConnection.id,
                        endpointId: endpoint.Id.toString(),
                    })
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
                    switchConnection({
                        connectionId: currentConnection.id,
                        endpointId: endpoint.Id.toString(),
                    })
                    break
                }
            }
        }
    }, [currentEndpointId, currentConnection?.id, switchConnection, endpointsQuery.data])

    return (
        <NativeTabs disableTransparentOnScrollEdge={true} tintColor={COLORS.primaryLight}>
            <NativeTabs.Trigger name="containers">
                <Label>Containers</Label>
                <Icon src={<VectorIcon family={Ionicons} name="cube" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="volumes">
                <Label>Volumes</Label>
                <Icon src={<VectorIcon family={Entypo} name="drive" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="images">
                <Label>Images</Label>
                <Icon src={<VectorIcon family={Ionicons} name="disc" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="networks">
                <Label>Networks</Label>
                <Icon src={<VectorIcon family={MaterialCommunityIcons} name="network" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="settings">
                <Label>Settings</Label>
                <Icon src={<VectorIcon family={Ionicons} name="settings" />} />
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
