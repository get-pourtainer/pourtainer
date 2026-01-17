import { COLORS } from '@/theme'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Icon, Label, VectorIcon } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

export default function StackTabsLayout() {
    return (
        <NativeTabs disableTransparentOnScrollEdge={true} tintColor={COLORS.primaryLight}>
            <NativeTabs.Trigger name="home">
                <Label>Compose</Label>
                <Icon src={<VectorIcon family={Ionicons} name="cube" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="environment">
                <Label>Environment</Label>
                <Icon src={<VectorIcon family={Ionicons} name="key" />} />
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
