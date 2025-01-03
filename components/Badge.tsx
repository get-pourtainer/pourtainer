import { Text, View } from 'react-native'

type BadgeProps = {
    label: string
    color?: string
    backgroundColor?: string
    monospace?: boolean
}

export function Badge({
    label,
    color = '#000',
    backgroundColor = '#f3f4f6',
    monospace = false,
}: BadgeProps) {
    return (
        <View
            style={{
                backgroundColor,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                borderWidth: 0.5,
                borderColor: `${color}25`,
            }}
        >
            <Text
                style={{
                    fontSize: 11,
                    color,
                    fontWeight: '500',
                    fontFamily: monospace ? 'monospace' : undefined,
                }}
            >
                {label}
            </Text>
        </View>
    )
} 