import { backupConfig } from '@/api/mutations'
import { fetchEndpoints } from '@/api/queries'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import { queryClient } from '@/lib/query'
import { mmkvStorage } from '@/lib/storage'
import { usePersistedStore } from '@/stores/persisted'
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { useMutation, useQueries } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system/legacy'
import * as Haptics from 'expo-haptics'
import { router, useNavigation } from 'expo-router'
import * as Sharing from 'expo-sharing'
import * as StoreReview from 'expo-store-review'
import { usePlacement } from 'expo-superwall'
import * as WebBrowser from 'expo-web-browser'
import ms from 'ms'
import { useCallback, useLayoutEffect, useMemo } from 'react'
import { Platform, StyleSheet, TouchableOpacity } from 'react-native'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function SettingsScreen() {
    const navigation = useNavigation()
    const { registerPlacement } = usePlacement()
    const connections = usePersistedStore((state) => state.connections)
    const removeConnection = usePersistedStore((state) => state.removeConnection)
    const resetAll = usePersistedStore((state) => state.resetAll)
    const switchConnection = usePersistedStore((state) => state.switchConnection)
    const currentConnection = usePersistedStore((state) => state.currentConnection)

    const endpointListQueries = useQueries({
        queries: connections.map((connection) => ({
            queryKey: ['endpoints', connection.id],
            queryFn: async () => {
                const endpoints = await fetchEndpoints({ connectionId: connection.id })
                return { endpoints, connectionId: connection.id }
            },
        })),
    })
    const backupConfigMutation = useMutation({
        mutationFn: async (password?: string) => {
            const base64Data = await backupConfig(password)

            if (!base64Data) {
                throw new Error('No data returned')
            }

            // Writing and sharing stay inside the mutation so their failures reach onError
            const isSharingAvailable = await Sharing.isAvailableAsync()
            if (!isSharingAvailable) {
                throw new Error('Sharing is not available on this platform')
            }

            // Create a temporary directory if it doesn't exist
            const tempDir = `${FileSystem.cacheDirectory}preview/`
            await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true }).catch(() => {})

            const fileName = `backup-${Math.floor(Date.now() / 1000)}.tar.gz`

            // Generate temporary file path
            const localFilePath = `${tempDir}${fileName}`

            // Save the file
            await FileSystem.writeAsStringAsync(localFilePath, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
            })

            await Sharing.shareAsync(localFilePath, {
                UTI: Platform.OS === 'ios' ? 'public.item' : undefined, // UTI for iOS
                mimeType: Platform.OS === 'android' ? 'application/tar+gzip' : undefined, // MIME type for Android
                dialogTitle: `Preview ${fileName}`,
            })
        },
        onError: (error) => {
            Sentry.captureException(error)
            Alert.alert('Error backing up config', error.message)
        },
    })

    const isLoading = useMemo(
        () => endpointListQueries.some((query) => query.isLoading),
        [endpointListQueries]
    )
    const isRefetching = useMemo(
        () => endpointListQueries.some((query) => query.isRefetching),
        [endpointListQueries]
    )
    const error = useMemo(
        () => endpointListQueries.some((query) => query.error),
        [endpointListQueries]
    )

    const refetch = useCallback(() => {
        for (const query of endpointListQueries) {
            query.refetch()
        }
    }, [endpointListQueries])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={[
                        {
                            title: 'Icons',
                            systemIcon: 'app.gift',
                        },
                        {
                            title: 'Feedback',
                            systemIcon: 'message',
                        },
                        {
                            title: 'Rate',
                            systemIcon: 'star.fill',
                        },
                    ]}
                    onPress={async (e) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)

                        if (e.nativeEvent.name === 'Icons') {
                            if (__DEV__) {
                                router.push('/icons')
                                return
                            }

                            registerPlacement({
                                placement: 'AppIcons',
                                feature: () => {
                                    router.push('/icons')
                                },
                            })
                            return
                        }
                        if (e.nativeEvent.name === 'Feedback') {
                            await WebBrowser.openBrowserAsync(process.env.EXPO_PUBLIC_FEEDBACK_URL!)
                            return
                        }
                        if (e.nativeEvent.name === 'Rate') {
                            Alert.alert(
                                'Do you like Pourtainer?',
                                'Let us know about your experience.',
                                [
                                    {
                                        text: 'No',
                                        onPress: () => {
                                            Alert.alert(
                                                'Thank you!',
                                                'Your review has been sent successfully.'
                                            )
                                        },
                                    },
                                    {
                                        text: 'Yes',
                                        onPress: () => {
                                            if (
                                                usePersistedStore.getState().installationTs <
                                                Date.now() - ms('1d')
                                            ) {
                                                StoreReview.requestReview()
                                                return
                                            }

                                            registerPlacement({
                                                placement: 'LifetimeOffer_1_Show',
                                                feature: async () => {
                                                    await StoreReview.requestReview()
                                                },
                                            }).catch((error) => {
                                                Sentry.captureException(error)
                                                console.error(
                                                    'Error registering LifetimeOffer_1_Show for Rate',
                                                    error
                                                )
                                            })
                                        },
                                    },
                                ]
                            )
                            return
                        }
                    }}
                >
                    <HeaderTouchableOpacity>
                        <Ionicons name="ellipsis-horizontal-sharp" size={32} color={COLORS.text} />
                    </HeaderTouchableOpacity>
                </ContextMenu>
            ),
        })
    }, [navigation, registerPlacement])

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
            {/* Endpoints Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Endpoints</Text>
                {(isLoading || error) && (
                    <View style={styles.card}>
                        {isLoading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" />
                            </View>
                        )}

                        {error && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>Failed to load all endpoints</Text>
                            </View>
                        )}
                    </View>
                )}

                {connections.map((connection, connectionIndex) => {
                    // Every connection gets a card, even when its endpoints failed to
                    // load, so a dead server can still be removed
                    const connectionId = connection.id
                    const endpointQuery = endpointListQueries[connectionIndex]
                    const endpoints = endpointQuery?.data?.endpoints

                    return (
                        <View style={styles.card} key={connectionId}>
                            <View style={styles.endpointItem}>
                                <View style={styles.endpointContent}>
                                    <Text style={styles.endpointName}>{connection?.baseUrl}</Text>
                                    <Text style={styles.endpointUrl}>
                                        Portainer {connection?.serverVersion ?? 'version unknown'}
                                    </Text>
                                    {endpointQuery?.isError && (
                                        <Text style={styles.errorText}>
                                            Could not load endpoints: {endpointQuery.error.message}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            {endpoints?.map((endpoint, endpointIndex) => (
                                <Pressable
                                    key={endpoint.Id}
                                    onPress={() =>
                                        switchConnection({
                                            connectionId: connectionId,
                                            endpointId: endpoint.Id.toString(),
                                        })
                                    }
                                    style={({ pressed }) => [
                                        styles.endpointItem,
                                        pressed && { opacity: 0.7 },
                                        endpointIndex === endpoints.length - 1 && {
                                            borderBottomWidth: 0,
                                        },
                                    ]}
                                >
                                    <View style={styles.endpointContent}>
                                        <Text style={styles.endpointName}>{endpoint.Name}</Text>
                                        <Text style={styles.endpointUrl}>{endpoint.URL}</Text>
                                    </View>

                                    {currentConnection?.id === connectionId &&
                                        currentConnection.currentEndpointId ===
                                            endpoint.Id.toString() && (
                                            <View style={styles.activeIndicator}>
                                                <Text style={styles.checkmark}>✓</Text>
                                            </View>
                                        )}
                                </Pressable>
                            ))}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderTopWidth: 1,
                                    borderTopColor: COLORS.hr,
                                }}
                            >
                                <TouchableOpacity
                                    onPress={() => {
                                        Alert.alert('Remove Connection', 'Are you sure?', [
                                            {
                                                text: 'Cancel',
                                                style: 'cancel',
                                            },
                                            {
                                                text: 'Remove connection',
                                                style: 'destructive',
                                                onPress: () => {
                                                    if (connections.length === 1) {
                                                        // Full reset: navigate first, then wipe the
                                                        // cache and storage and put the store back to
                                                        // its defaults so nothing stale is re-persisted
                                                        router.dismissAll()
                                                        router.replace('/login')
                                                        queryClient.clear()
                                                        mmkvStorage.clearAll()
                                                        resetAll()
                                                        return
                                                    }

                                                    removeConnection(connectionId)
                                                },
                                            },
                                        ])
                                    }}
                                    style={{
                                        backgroundColor: COLORS.errorDark,
                                        height: 50,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        flex: 1,
                                    }}
                                >
                                    <Text style={{ color: COLORS.text, textAlign: 'center' }}>
                                        Remove
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        Alert.prompt(
                                            'Backup Config',
                                            'Enter password or leave empty for no password',
                                            [
                                                {
                                                    text: 'Cancel',
                                                    style: 'cancel',
                                                },
                                                {
                                                    text: 'Backup config',
                                                    style: 'default',
                                                    onPress: (password?: string) => {
                                                        backupConfigMutation.mutate(password)
                                                    },
                                                },
                                            ],
                                            'plain-text'
                                        )
                                    }}
                                    style={{
                                        backgroundColor: COLORS.primaryDark,
                                        height: 50,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        flex: 1,
                                    }}
                                >
                                    {backupConfigMutation.isPending ? (
                                        <ActivityIndicator size="small" />
                                    ) : (
                                        <Text style={{ color: COLORS.text, textAlign: 'center' }}>
                                            Backup Config
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                })}
            </View>

            <TouchableOpacity
                style={styles.addConnectionButton}
                onPress={() => {
                    const featureFn = () => {
                        router.push('/login')
                    }

                    if (__DEV__) {
                        featureFn()
                        return
                    }

                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

                    registerPlacement({
                        placement: 'AddConnection',
                        feature: featureFn,
                    }).catch((error) => {
                        Sentry.captureException(error)
                        console.error('Error registering AddConnection', error)
                        Alert.alert('Error', 'Something went wrong, please try again.')
                    })
                }}
            >
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 700 }}>
                    Add Connection
                </Text>
            </TouchableOpacity>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: SPACING.md,
        gap: SPACING.lg,
    },
    section: {
        gap: SPACING.md,
    },
    sectionTitle: StyleSheet.flatten([
        TYPOGRAPHY.title,
        {
            color: COLORS.text,
        },
    ]),
    card: StyleSheet.flatten([
        {
            backgroundColor: COLORS.bgSecondary,
            borderRadius: BORDER_RADIUS.lg,
            overflow: 'hidden',
        },
        SHADOWS.small,
    ]),
    addConnectionButton: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        padding: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        padding: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    endpointItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.hrPrimary,
    },
    endpointContent: {
        flex: 1,
        gap: SPACING.xs,
    },
    endpointName: StyleSheet.flatten([
        TYPOGRAPHY.subtitle,
        {
            color: COLORS.primaryLight,
        },
    ]),
    endpointUrl: StyleSheet.flatten([
        TYPOGRAPHY.small,
        {
            color: COLORS.textMuted,
        },
    ]),
    activeIndicator: {
        width: 24,
        height: 24,
        borderRadius: BORDER_RADIUS.circle(24),
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    errorText: StyleSheet.flatten([
        TYPOGRAPHY.subtitle,
        {
            color: COLORS.errorLight,
        },
    ]),
})
