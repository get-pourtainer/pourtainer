import { fetchStack } from '@/api/queries'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import { useFlashlistProps } from '@/lib/hooks'
import { COLORS } from '@/theme'
import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useGlobalSearchParams } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { useMemo } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'

export default function StackEnvironmentScreen() {
    const { stackId } = useGlobalSearchParams<{ stackId: string }>()

    const stackQuery = useQuery({
        queryKey: ['stack', stackId],
        queryFn: async () => fetchStack(Number(stackId)),
        enabled: !!stackId,
    })

    const environmentVariables = useMemo(() => {
        return stackQuery.data?.Env || []
    }, [stackQuery.data?.Env])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: stackQuery.isLoading,
            hasData: environmentVariables.length > 0,
            emptyLabel: 'No environment variables found',
            isError: stackQuery.isError,
            errorLabel: 'Failed to fetch stack environment variables',
        })
    }, [stackQuery.isLoading, environmentVariables.length, stackQuery.isError])

    const { overrideProps } = useFlashlistProps(Placeholder)

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={stackQuery.refetch} />}
            showsVerticalScrollIndicator={false}
            data={environmentVariables}
            overrideProps={overrideProps}
            ListEmptyComponent={Placeholder}
            renderItem={({ item: env, index: envIndex }) => (
                <View
                    style={{
                        backgroundColor: envIndex % 2 === 0 ? COLORS.bgSecondary : COLORS.bgApp,
                        padding: 16,
                        paddingHorizontal: 20,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <View style={{ flexDirection: 'column', gap: 4, flex: 1 }}>
                        <Text
                            style={{
                                color: COLORS.primary,
                                fontWeight: '600',
                                fontSize: 14,
                            }}
                            numberOfLines={1}
                        >
                            {env.name}
                        </Text>
                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 12,
                                fontFamily: 'monospace',
                            }}
                            numberOfLines={2}
                        >
                            {env.value}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            Alert.alert(
                                'Coming soon :)',
                                'Give us a quick rating to push this feature even faster?',
                                [
                                    {
                                        text: 'Sure!',
                                        style: 'default',
                                        onPress: () => {
                                            StoreReview.requestReview()
                                        },
                                    },
                                    { text: 'I like waiting', style: 'destructive' },
                                ]
                            )
                        }}
                        hitSlop={20}
                    >
                        <Ionicons name="pencil" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>
            )}
        />
    )
}
