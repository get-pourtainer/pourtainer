import ActivityIndicator from '@/components/base/ActivityIndicator'
import Text from '@/components/base/Text'
import { COLORS } from '@/theme'
import { View } from 'react-native'

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
    emptyLabel: string
    errorLabel: string
}) {
    if (isLoading) {
        return (
            <PlaceholderRoot>
                <ActivityIndicator />
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
                    {errorLabel}
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
                    {emptyLabel}
                </Text>
            </PlaceholderRoot>
        )
    }
    return undefined
}

// Memoize the entire component
// export default React.memo(EmptyListComponent, (prevProps, nextProps) => {
//     return (
//         prevProps.isLoading === nextProps.isLoading &&
//         prevProps.isError === nextProps.isError &&
//         prevProps.hasData === nextProps.hasData &&
//         prevProps.emptyLabel === nextProps.emptyLabel &&
//         prevProps.errorLabel === nextProps.errorLabel
//     )
// })

function PlaceholderRoot({ children }: { children: React.ReactNode }) {
    return (
        <View
            style={{
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom: 150,
            }}
        >
            {children}
        </View>
    )
}
