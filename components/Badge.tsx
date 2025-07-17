import { COLORS } from '@/theme'
import { Text, View } from 'react-native'

type BadgeProps = {
    label: string
    color?: string
    backgroundColor?: string
    monospace?: boolean
}

export function Badge({
    label,
    color = COLORS.textMuted,
    backgroundColor = COLORS.bgSecondary,
    monospace = false,
}: BadgeProps) {
    return (
        <View
            style={{
                backgroundColor,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 7,
                borderWidth: 0.5,
                borderColor: `${color}25`,
            }}
        >
            <Text
                style={{
                    fontSize: 12,
                    color,
                    fontWeight: 500,
                    fontFamily: monospace ? 'monospace' : undefined,
                }}
            >
                {label}
            </Text>
        </View>
    )
}
