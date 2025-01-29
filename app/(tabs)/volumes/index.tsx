import { deleteVolume } from '@/api/mutations'
import { fetchVolumeContent, fetchVolumes } from '@/api/queries'
import { type ActionSheetOption, showActionSheet } from '@/components/ActionSheet'
import { Badge } from '@/components/Badge'
import type { Volume } from '@/types/volume'
import Clipboard from '@react-native-clipboard/clipboard'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation, useRouter } from 'expo-router'
import { useEffect, useLayoutEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'

function VolumeRow({
    volume,
    index,
    total,
    isBrowsingSupported,
}: {
    volume: Volume
    index?: number
    total?: number
    isBrowsingSupported: boolean
}) {
    const router = useRouter()
    const queryClient = useQueryClient()

    const handlePress = () => {
        const options: ActionSheetOption[] = []

        if (isBrowsingSupported) {
            options.push({
                label: 'Browse',
                onPress: () => {
                    router.push(`/volume/${encodeURIComponent(volume.Name)}`)
                },
            })
        }

        options.push(
            {
                label: 'Copy ID',
                onPress: () => {
                    Clipboard.setString(volume.Name)
                },
            },
            {
                label: 'Delete',
                destructive: true,
                onPress: async () => {
                    try {
                        await deleteVolume(volume.Name)
                        queryClient.invalidateQueries({ queryKey: ['volumes'] })
                    } catch (error) {
                        Alert.alert(
                            'Error',
                            error instanceof Error ? error.message : 'Failed to delete volume'
                        )
                    }
                },
            },
            {
                label: 'Cancel',
                cancel: true,
                onPress: () => {},
            }
        )

        showActionSheet(volume.Name, options)
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[
                styles.volumeRow,
                index !== undefined &&
                    total !== undefined &&
                    index !== total - 1 &&
                    styles.borderBottom,
            ]}
        >
            <Text style={styles.volumeName}>{volume.Name}</Text>

            <View style={styles.badgeContainer}>
                <Badge label={volume.Driver} color="#0369a1" backgroundColor="#bae6fd" />

                <Badge
                    label={new Date(volume.CreatedAt).toLocaleDateString()}
                    color="#15803d"
                    backgroundColor="#bbf7d0"
                />

                {volume.Labels?.['com.docker.compose.project'] && (
                    <Badge
                        label={volume.Labels['com.docker.compose.project']}
                        color="#475569"
                        backgroundColor="#e2e8f0"
                    />
                )}
            </View>
        </TouchableOpacity>
    )
}

export default function VolumesScreen() {
    const [searchQuery, setSearchQuery] = useState('')
    const [isBrowsingSupported, setIsBrowsingSupported] = useState(false)
    const navigation = useNavigation()

    const volumesQuery = useQuery({
        queryKey: ['volumes'],
        queryFn: fetchVolumes,
    })

    // Check browsing support once when volumes are loaded
    useEffect(() => {
        if (!volumesQuery.isSuccess || !volumesQuery.data || volumesQuery.data.length === 0) return

        // Only check once when we first get volumes
        fetchVolumeContent(volumesQuery.data[0].Name, '/')
            .then(() => setIsBrowsingSupported(true))
            .catch(() => setIsBrowsingSupported(false))
    }, [volumesQuery.data, volumesQuery.isSuccess])

    // Set up the search bar in the navigation header
    useLayoutEffect(() => {
        const theme = UnistylesRuntime.getTheme()

        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Search volumes...',
                hideWhenScrolling: true,
                barTintColor: theme.colors.searchBar.background,
                textColor: theme.colors.searchBar.text,
                placeholderTextColor: theme.colors.searchBar.placeholder,
                onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
            },
        })
    }, [navigation])

    // Show loading state
    if (volumesQuery.isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={styles.loadingIndicator.color} />
            </View>
        )
    }

    // Show error if query has an error
    if (volumesQuery.error) {
        return (
            <View style={styles.centerContainer}>
                <Text>Error loading volumes</Text>
            </View>
        )
    }

    const filteredVolumes = volumesQuery.data?.filter((volume) => {
        const query = searchQuery.toLowerCase()
        const volumeName = volume.Name.toLowerCase()
        const stackName = volume.Labels?.['com.docker.compose.project']?.toLowerCase() || ''
        return volumeName.includes(query) || stackName.includes(query)
    })

    return (
        <FlatList
            data={filteredVolumes}
            renderItem={({ item, index }) => (
                <VolumeRow
                    volume={item}
                    index={index}
                    total={filteredVolumes?.length}
                    isBrowsingSupported={isBrowsingSupported}
                />
            )}
            keyExtractor={(item) => item.Name}
            ListEmptyComponent={
                <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No volumes match your search</Text>
                </View>
            }
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.listContainer}
            style={styles.list}
            refreshControl={
                <RefreshControl
                    refreshing={volumesQuery.isRefetching}
                    onRefresh={volumesQuery.refetch}
                />
            }
        />
    )
}

const styles = StyleSheet.create((theme) => ({
    volumeRow: {
        padding: theme.spacing.md,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primaryLight,
    },
    volumeName: StyleSheet.flatten([
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
    listContainer: {
        backgroundColor: theme.colors.background.list,
        position: 'relative',
        borderTopWidth: 1,
        borderTopColor: theme.colors.primaryLight,
    },
    list: {
        backgroundColor: theme.colors.background.list,
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
}))
