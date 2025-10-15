import { COLORS } from '@/theme'
import { ActivityIndicator as RNActivityIndicator } from 'react-native'

export default function ActivityIndicator({
    size = 'large',
}: {
    size?: 'small' | 'large'
}) {
    return <RNActivityIndicator size={size} color={COLORS.primaryLight} />
}
