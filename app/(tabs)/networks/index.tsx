import { fetchNetworks } from '@/api/queries'
import { Badge } from '@/components/Badge'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import type { components } from '@/lib/docker/schema'
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import Clipboard from '@react-native-clipboard/clipboard'
import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useNavigation } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

function NetworkRow({ network }: { network: components['schemas']['Network'] }) {
    return (
        <View style={styles.networkRow}>
            <Text style={styles.networkName}>{network.Name}</Text>

            <View style={styles.badgeContainer}>
                {/* Network ID Badge */}
                <Badge label={network.Id.substring(0, 12)} monospace={true} />

                {/* Driver Badge */}
                {network.Driver && (
                    <Badge
                        label={network.Driver}
                        color={COLORS.primaryLight}
                        backgroundColor={COLORS.primaryDark}
                    />
                )}

                {/* Scope Badge */}
                {network.Scope && (
                    <Badge
                        label={network.Scope}
                        color={COLORS.successLight}
                        backgroundColor={COLORS.successDark}
                    />
                )}

                {/* IPv6 Badge */}
                {network.EnableIPv6 && (
                    <Badge
                        label="IPv6"
                        color={COLORS.primaryLight}
                        backgroundColor={COLORS.primaryDark}
                    />
                )}

                {/* Internal Badge */}
                {network.Internal && (
                    <Badge
                        label="Internal"
                        color={COLORS.errorLight}
                        backgroundColor={COLORS.errorDark}
                    />
                )}

                {/* Attachable Badge */}
                {network.Attachable && (
                    <Badge
                        label="Attachable"
                        color={COLORS.warningLight}
                        backgroundColor={COLORS.warningDark}
                    />
                )}

                {/* IPAM Info */}
                {network.IPAM?.Config && network.IPAM.Config.length > 0 && (
                    <>
                        <Badge
                            label={network.IPAM.Config[0]!.Subnet || 'Unnamed subnet'}
                            monospace={true}
                        />

                        {network.IPAM.Config[0]!.Gateway && (
                            <Badge
                                label={`GW: ${network.IPAM.Config[0].Gateway}`}
                                monospace={true}
                            />
                        )}
                    </>
                )}
            </View>
        </View>
    )
}

export default function NetworksScreen() {
    const [searchQuery, setSearchQuery] = useState('')
    const navigation = useNavigation()

    const networksQuery = useQuery({
        queryKey: ['networks'],
        queryFn: fetchNetworks,
    })

    const filteredNetworks = useMemo(() => {
        if (!networksQuery.data) return []
        return networksQuery.data.filter((network) => {
            const query = searchQuery.toLowerCase()
            return (
                network.Name?.toLowerCase().includes(query) ||
                network.Id.toLowerCase().includes(query) ||
                network.Driver?.toLowerCase().includes(query)
            )
        })
    }, [networksQuery.data, searchQuery])

    const handleNetworkAction = useCallback(
        (network: components['schemas']['Network'], actionName: string) => {
            if (actionName === 'Copy ID') {
                Clipboard.setString(network.Id)
            } else if (actionName === 'Edit') {
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
            }
        },
        []
    )

    const Placeholder = useMemo(() => {
        const isSearch = searchQuery.trim() !== ''

        const emptyNetworks = buildPlaceholder({
            isLoading: networksQuery.isLoading,
            isError: networksQuery.isError,
            hasData: filteredNetworks.length > 0,
            emptyLabel: isSearch ? 'No networks match your search' : 'No networks found',
            errorLabel: 'Error loading networks',
        })

        return emptyNetworks
    }, [networksQuery.isLoading, networksQuery.isError, filteredNetworks.length, searchQuery])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Search networks...',
                hideWhenScrolling: true,
                barTintColor: COLORS.bgSecondary,
                textColor: COLORS.text,
                onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
                autoCapitalize: 'none',
                tintColor: COLORS.primary,
                hintTextColor: COLORS.textMuted,
                headerIconColor: COLORS.primary,
            },
        })
    }, [navigation])

    if (Placeholder) {
        return Placeholder
    }

    return (
        <FlatList
            data={filteredNetworks}
            renderItem={({ item: network }) => (
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={[
                        {
                            title: 'Copy ID',
                            systemIcon: 'doc.on.doc',
                        },
                        {
                            title: 'Edit',
                            systemIcon: 'pencil',
                        },
                    ]}
                    onPress={(e) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        handleNetworkAction(network, e.nativeEvent.name)
                    }}
                >
                    <NetworkRow network={network} />
                </ContextMenu>
            )}
            keyExtractor={(network) => network.Id}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={networksQuery.refetch} />}
        />
    )
}

const styles = StyleSheet.create({
    networkRow: {
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.hr,
    },
    networkName: StyleSheet.flatten([
        TYPOGRAPHY.subtitle,
        SHADOWS.text,
        {
            color: COLORS.text,
            marginBottom: SPACING.sm,
        },
    ]),
    badgeContainer: {
        flexDirection: 'row',
        marginTop: SPACING.sm,
        gap: SPACING.sm,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        width: '100%',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingIndicator: {
        color: COLORS.text,
    },
    noResultsContainer: {
        alignItems: 'center',
        padding: SPACING.lg,
    },
    noResultsText: {
        fontSize: TYPOGRAPHY.subtitle.fontSize,
        color: COLORS.textMuted,
    },
})
