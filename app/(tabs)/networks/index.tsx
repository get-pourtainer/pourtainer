import React from 'react'
import { fetchNetworks } from '@/api/queries'
import { type ActionSheetOption, showActionSheet } from '@/components/ActionSheet'
import { Badge } from '@/components/Badge'
import type { Network } from '@/types/network'
import Clipboard from '@react-native-clipboard/clipboard'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from 'expo-router'
import { useLayoutEffect, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'

function NetworkRow({
    network,
    index,
    total,
    onPress,
}: {
    network: Network
    index?: number
    total?: number
    onPress: () => void
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.networkRow,
                index !== undefined &&
                    total !== undefined &&
                    index !== total - 1 &&
                    styles.rowBorder,
            ]}
        >
            <Text style={styles.networkName}>{network.Name}</Text>

            <View style={styles.badgeContainer}>
                {/* Network ID Badge */}
                <Badge
                    label={network.Id.substring(0, 12)}
                    color="#475569"
                    backgroundColor="#e2e8f0"
                    monospace={true}
                />

                {/* Driver Badge */}
                <Badge label={network.Driver} color="#0369a1" backgroundColor="#bae6fd" />

                {/* Scope Badge */}
                <Badge label={network.Scope} color="#15803d" backgroundColor="#bbf7d0" />

                {/* IPv6 Badge */}
                {network.EnableIPv6 && (
                    <Badge label="IPv6" color="#6b21a8" backgroundColor="#ddd6fe" />
                )}

                {/* Internal Badge */}
                {network.Internal && (
                    <Badge label="Internal" color="#b91c1c" backgroundColor="#fecaca" />
                )}

                {/* Attachable Badge */}
                {network.Attachable && (
                    <Badge label="Attachable" color="#c2410c" backgroundColor="#fed7aa" />
                )}

                {/* IPAM Info */}
                {network.IPAM.Config && network.IPAM.Config.length > 0 && (
                    <>
                        <Badge
                            label={network.IPAM.Config[0].Subnet}
                            color="#475569"
                            backgroundColor="#e2e8f0"
                            monospace={true}
                        />

                        {network.IPAM.Config[0].Gateway && (
                            <Badge
                                label={`GW: ${network.IPAM.Config[0].Gateway}`}
                                color="#475569"
                                backgroundColor="#e2e8f0"
                                monospace={true}
                            />
                        )}
                    </>
                )}
            </View>
        </TouchableOpacity>
    )
}

export default function NetworksScreen() {
    const [searchQuery, setSearchQuery] = useState('')
    const navigation = useNavigation()

    const networksQuery = useQuery({
        queryKey: ['networks'],
        queryFn: fetchNetworks,
    })

    useLayoutEffect(() => {
        const theme = UnistylesRuntime.getTheme()

        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Search networks...',
                hideWhenScrolling: true,
                barTintColor: theme.colors.searchBar.background,
                textColor: theme.colors.searchBar.text,
                placeholderTextColor: theme.colors.searchBar.placeholder,
                onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
            },
        })
    }, [navigation])

    // Show loading state
    if (networksQuery.isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={styles.loadingIndicator.color} />
            </View>
        )
    }

    // Show error if query has an error
    if (networksQuery.error) {
        return (
            <View style={styles.centerContainer}>
                <Text>Error loading networks</Text>
            </View>
        )
    }

    const filteredNetworks = networksQuery.data?.filter((network) => {
        const query = searchQuery.toLowerCase()
        return (
            network.Name.toLowerCase().includes(query) ||
            network.Id.toLowerCase().includes(query) ||
            network.Driver.toLowerCase().includes(query)
        )
    })

    const handleNetworkPress = (network: Network) => {
        const options: ActionSheetOption[] = [
            {
                label: 'Copy ID',
                onPress: () => {
                    Clipboard.setString(network.Id)
                },
            },
            {
                label: 'Cancel',
                cancel: true,
                onPress: () => {},
            },
        ]

        showActionSheet(network.Name, options)
    }

    return (
        <FlatList
            data={filteredNetworks}
            renderItem={({ item, index }) => (
                <NetworkRow
                    network={item}
                    index={index}
                    total={filteredNetworks?.length}
                    onPress={() => handleNetworkPress(item)}
                />
            )}
            keyExtractor={(item) => item.Id}
            ListEmptyComponent={
                <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No networks match your search</Text>
                </View>
            }
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.listContainer}
            style={styles.list}
            refreshControl={
                <RefreshControl
                    refreshing={networksQuery.isRefetching}
                    onRefresh={networksQuery.refetch}
                />
            }
        />
    )
}

const styles = StyleSheet.create((theme) => ({
    networkRow: {
        padding: theme.spacing.md,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primaryLight,
    },
    networkName: StyleSheet.flatten([
        theme.typography.subtitle,
        theme.shadows.text,
        {
            color: theme.colors.text.white,
            marginBottom: theme.spacing.sm,
        },
    ]),
    badgeContainer: {
        flexDirection: 'row',
        marginTop: theme.spacing.sm,
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        width: '100%',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.list,
    },
    loadingIndicator: {
        color: theme.colors.text.white,
    },
    noResultsContainer: {
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    noResultsText: {
        fontSize: theme.typography.subtitle.fontSize,
        color: theme.colors.text.light,
    },
    listContainer: {
        backgroundColor: theme.colors.background.list,
        position: 'relative',
        borderTopWidth: 1,
        borderTopColor: theme.colors.primaryLight,
    },
    list: {
        backgroundColor: theme.colors.background.list,
    },
}))
