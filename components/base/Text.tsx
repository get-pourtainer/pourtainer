import { COLORS } from '@/theme'
import { useMemo } from 'react'
import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native'

export default function Text(props: RNTextProps) {
    const mergedStyle = useMemo(() => {
        return StyleSheet.flatten([
            {
                fontSize: 12,
                color: COLORS.text,
            },
            props.style,
        ])
    }, [props.style])

    return (
        <RNText
            numberOfLines={1}
            ellipsizeMode="tail"
            {...props}
            allowFontScaling={false}
            style={mergedStyle}
        />
    )
}
