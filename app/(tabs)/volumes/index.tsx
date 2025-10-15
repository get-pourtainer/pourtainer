import { deleteVolume } from '@/api/mutations'
import { fetchVolumeContent, fetchVolumes } from '@/api/queries'
import { type ActionSheetOption, showActionSheet } from '@/components/ActionSheet'
import { Badge } from '@/components/Badge'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import type { components } from '@/lib/docker/schema'
import WidgetKitModule from '@/modules/widgetkit'
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import Clipboard from '@react-native-clipboard/clipboard'
import Superwall from '@superwall/react-native-superwall'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation, useRouter } from 'expo-router'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Linking, StyleSheet } from 'react-native'
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native'

function VolumeRow({
    volume,
    isBrowsingSupported,
}: {
    volume: components['schemas']['Volume']
    isBrowsingSupported: boolean
}) {
    const router = useRouter()
    const queryClient = useQueryClient()

    const handlePress = () => {
        const options: ActionSheetOption[] = []

        options.push({
            label: 'Browse',
            onPress: () => {
                if (__DEV__) {
                    WidgetKitModule.setIsSubscribed(true)
                    if (!isBrowsingSupported) {
                        alert('Browsing not supported')
                        return
                    }
                    router.push(`/volume/${encodeURIComponent(volume.Name)}`)
                    return
                }

                Superwall.shared
                    .register({
                        placement: 'BrowseVolume',
                        feature: () => {
                            WidgetKitModule.setIsSubscribed(true)
                            if (!isBrowsingSupported) {
                                Alert.alert(
                                    'Browsing requires having Portainer Agent installed on your instance.',
                                    'Do you want to see a guide on how to install it?',
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel',
                                        },
                                        {
                                            text: 'Yes',
                                            onPress: () => {
                                                try {
                                                    Linking.openURL(
                                                        'https://docs.portainer.io/admin/environments/add/docker/agent'
                                                    )
                                                } catch {
                                                    Alert.alert(
                                                        'Could not open URL',
                                                        'Something went wrong, please try again.'
                                                    )
                                                }
                                            },
                                        },
                                    ]
                                )
                                return
                            }
                            router.push(`/volume/${encodeURIComponent(volume.Name)}`)
                        },
                    })
                    .catch((error) => {
                        console.error('Error registering BrowseVolume', error)
                        Alert.alert('Error', 'Something went wrong, please try again.')
                    })
            },
        })

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
        <TouchableOpacity onPress={handlePress} style={styles.volumeRow}>
            <Text style={styles.volumeName}>{volume.Name}</Text>

            <View style={styles.badgeContainer}>
                <Badge
                    label={volume.Driver}
                    color={COLORS.primaryLight}
                    backgroundColor={COLORS.primaryDark}
                />

                {volume.CreatedAt && (
                    <Badge
                        label={new Date(volume.CreatedAt).toLocaleDateString()}
                        color={COLORS.successLight}
                        backgroundColor={COLORS.successDark}
                    />
                )}

                {volume.Labels?.['com.docker.compose.project'] && (
                    <Badge label={volume.Labels['com.docker.compose.project']} />
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

    const filteredVolumes = useMemo(() => {
        if (!volumesQuery.data) return []
        return volumesQuery.data.filter((volume) => {
            const query = searchQuery.toLowerCase()
            const volumeName = volume.Name.toLowerCase()
            const stackName = volume.Labels?.['com.docker.compose.project']?.toLowerCase() || ''
            return volumeName.includes(query) || stackName.includes(query)
        })
    }, [volumesQuery.data, searchQuery])

    // Check browsing support once when volumes are loaded
    useEffect(() => {
        if (!volumesQuery.isSuccess || !volumesQuery.data || volumesQuery.data.length === 0) return

        // Only check once when we first get volumes
        fetchVolumeContent(volumesQuery.data[0].Name, '/')
            .then(() => setIsBrowsingSupported(true))
            .catch(() => setIsBrowsingSupported(false))
    }, [volumesQuery.data, volumesQuery.isSuccess])

    const Placeholder = useMemo(() => {
        const isSearch = searchQuery.trim() !== ''

        const emptyVolumes = buildPlaceholder({
            isLoading: volumesQuery.isLoading,
            isError: volumesQuery.isError,
            hasData: filteredVolumes.length > 0,
            emptyLabel: isSearch ? 'No volumes match your search' : 'No volumes found',
            errorLabel: 'Error loading volumes',
        })

        return emptyVolumes
    }, [volumesQuery.isLoading, volumesQuery.isError, filteredVolumes.length, searchQuery])

    // Set up the search bar in the navigation header
    useLayoutEffect(() => {
        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Search volumes...',
                hideWhenScrolling: true,
                barTintColor: COLORS.bgApp,
                textColor: COLORS.text,
                tintColor: COLORS.primary,
                onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),

                //! do not seem to work
                hintTextColor: 'red',
                placeholderTextColor: 'red',
                autoCapitalize: 'none',
            },
        })
    }, [navigation])

    if (Placeholder) {
        return Placeholder
    }

    return (
        <FlatList
            data={filteredVolumes}
            renderItem={({ item: volume }) => (
                <VolumeRow volume={volume} isBrowsingSupported={isBrowsingSupported} />
            )}
            keyExtractor={(volume) => volume.Name}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={volumesQuery.refetch} />}
        />
    )
}

const styles = StyleSheet.create({
    volumeRow: {
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.hr,
    },
    volumeName: StyleSheet.flatten([
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
