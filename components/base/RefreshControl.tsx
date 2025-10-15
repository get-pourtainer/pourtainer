import { COLORS } from '@/theme'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { RefreshControl as RNRefreshControl } from 'react-native'

export default function RefreshControl({
    refreshing,
    onRefresh,
    children,
}: {
    refreshing?: boolean
    onRefresh: () => Promise<any>
    children?: React.ReactNode
}) {
    const [isRefreshing, setIsRefreshing] = useState(false)

    return (
        <RNRefreshControl
            tintColor={COLORS.primaryLight}
            refreshing={refreshing ?? isRefreshing}
            onRefresh={async () => {
                setIsRefreshing(true)
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                await onRefresh()
                setIsRefreshing(false)
            }}
            // android
            progressBackgroundColor={COLORS.bgSecondary}
            colors={[COLORS.primaryLight]}
        >
            {children}
        </RNRefreshControl>
    )
}
