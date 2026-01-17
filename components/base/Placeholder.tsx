import ActivityIndicator from '@/components/base/ActivityIndicator'
import Text from '@/components/base/Text'
import { COLORS } from '@/theme'
import { useEffect, useMemo, useState } from 'react'
import { Platform, View } from 'react-native'

export default function buildPlaceholder({
    isLoading,
    isError,
    hasData,
    emptyLabel,
    errorLabel,
}: {
    isLoading: boolean
    isError: boolean
    hasData: boolean | undefined
    emptyLabel: string | React.ReactNode
    errorLabel: string | React.ReactNode
}) {
    if (isLoading) {
        return (
            <PlaceholderRoot>
                <LoadingIndicatorWithHint />
            </PlaceholderRoot>
        )
    }
    if (isError) {
        return (
            <PlaceholderRoot>
                <Text
                    style={{
                        fontSize: 16,
                        color: COLORS.error,
                        textAlign: 'center',
                        maxWidth: 320,
                    }}
                    numberOfLines={10}
                >
                    {typeof errorLabel === 'string' ? <Text>{errorLabel}</Text> : errorLabel}
                </Text>
            </PlaceholderRoot>
        )
    }
    if (!hasData) {
        return (
            <PlaceholderRoot>
                <Text
                    style={{
                        fontSize: 16,
                        color: COLORS.text,
                        textAlign: 'center',
                        maxWidth: 320,
                    }}
                    numberOfLines={10}
                >
                    {typeof emptyLabel === 'string' ? <Text>{emptyLabel}</Text> : emptyLabel}
                </Text>
            </PlaceholderRoot>
        )
    }
    return undefined
}

function LoadingIndicatorWithHint() {
    const [shouldShowHint, setShouldShowHint] = useState(false)

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setShouldShowHint(true)
        }, 4000)
        return () => {
            clearTimeout(timeoutId)
        }
    }, [])

    return (
        <>
            <ActivityIndicator />
            {shouldShowHint ? (
                <Text
                    style={{
                        fontSize: 16,
                        color: COLORS.text,
                        textAlign: 'center',
                        fontWeight: 500,
                        maxWidth: 320,
                        marginTop: 16,
                    }}
                >
                    This could take a while...
                </Text>
            ) : null}
        </>
    )
}

function PlaceholderRoot({ children }: { children: React.ReactNode }) {
    const isAndroid = useMemo(() => Platform.OS === 'android', [])

    return (
        <View
            style={{
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom: 150,
                paddingTop: isAndroid ? 100 : undefined,
            }}
        >
            {children}
        </View>
    )
}
