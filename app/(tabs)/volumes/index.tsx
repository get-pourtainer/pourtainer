import { deleteVolume } from '@/api/mutations'
import { fetchVolumeContent, fetchVolumes } from '@/api/queries'
import { Badge } from '@/components/Badge'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import type { components } from '@/lib/docker/schema'
import WidgetKitModule from '@/modules/widgetkit'
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import Clipboard from '@react-native-clipboard/clipboard'
import * as Sentry from '@sentry/react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useNavigation, useRouter } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { usePlacement } from 'expo-superwall'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Linking, StyleSheet, Text, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

function VolumeRow({
    volume,
    isBrowsingSupported,
}: {
    volume: components['schemas']['Volume']
    isBrowsingSupported: boolean
}) {
    const { registerPlacement } = usePlacement()
    const router = useRouter()
    const queryClient = useQueryClient()

    const handleAction = (actionName: string) => {
        if (actionName === 'Browse') {
            const featureFn = () => {
                WidgetKitModule.setIsSubscribed(true)
                if (!isBrowsingSupported) {
                    Alert.alert(
                        'Browsing requires having Portainer Agent installed',
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
            }
            if (__DEV__) {
                featureFn()
                return
            }

            registerPlacement({
                placement: 'BrowseVolume',
                feature: featureFn,
            }).catch((error) => {
                Sentry.captureException(error)
                console.error('Error registering BrowseVolume', error)
                Alert.alert('Error', 'Something went wrong, please try again.')
            })
        } else if (actionName === 'Copy ID') {
            Clipboard.setString(volume.Name)
        } else if (actionName === 'Delete') {
            deleteVolume(volume.Name)
                .then(() => {
                    queryClient.invalidateQueries({ queryKey: ['volumes'] })
                })
                .catch((error) => {
                    Sentry.captureException(error)
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    Alert.alert(
                        'Error',
                        error instanceof Error ? error.message : 'Failed to delete volume'
                    )
                })
        } else {
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
    }

    return (
        <ContextMenu
            dropdownMenuMode={true}
            actions={[
                {
                    title: 'Browse',
                    systemIcon: 'folder',
                },
                {
                    title: 'Copy ID',
                    systemIcon: 'doc.on.doc',
                },
                {
                    title: 'Edit',
                    systemIcon: 'pencil',
                },
                {
                    title: 'Rename',
                    systemIcon: 'pencil',
                },
                {
                    title: 'Delete',
                    destructive: true,
                    systemIcon: 'trash',
                },
            ]}
            onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                handleAction(e.nativeEvent.name)
            }}
        >
            <View style={styles.volumeRow}>
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
            </View>
        </ContextMenu>
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
