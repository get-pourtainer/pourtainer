import { useEnsureEndpoint } from '@/lib/portainer/endpoint'
import { useSyncServerVersion } from '@/lib/portainer/version'
import { COLORS } from '@/theme'
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Icon, Label, VectorIcon } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

export default function TabLayout() {
    useSyncServerVersion()

    useEnsureEndpoint()

    return (
        <NativeTabs disableTransparentOnScrollEdge={true} tintColor={COLORS.primaryLight}>
            <NativeTabs.Trigger name="containers">
                <Label>{isLiquidGlassAvailable() ? '' : 'Containers'}</Label>
                <Icon renderingMode="template" src={<VectorIcon family={Ionicons} name="cube" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="volumes">
                <Label>{isLiquidGlassAvailable() ? '' : 'Volumes'}</Label>
                <Icon renderingMode="template" src={<VectorIcon family={Entypo} name="drive" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="images">
                <Label>{isLiquidGlassAvailable() ? '' : 'Images'}</Label>
                <Icon renderingMode="template" src={<VectorIcon family={Ionicons} name="disc" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="networks">
                <Label>{isLiquidGlassAvailable() ? '' : 'Networks'}</Label>
                <Icon
                    renderingMode="template"
                    src={<VectorIcon family={MaterialCommunityIcons} name="network" />}
                />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="settings">
                <Label>{isLiquidGlassAvailable() ? '' : 'Settings'}</Label>
                <Icon
                    renderingMode="template"
                    src={<VectorIcon family={Ionicons} name="settings" />}
                />
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
