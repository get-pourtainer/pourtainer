import { backupConfig } from '@/api/mutations'
import { fetchEndpoints } from '@/api/queries'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import { usePersistedStore } from '@/stores/persisted'
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import WidgetKitModule from '@/widgetkit'
import * as Sentry from '@sentry/react-native'
import Superwall from '@superwall/react-native-superwall'
import { useMutation, useQueries } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useCallback, useMemo } from 'react'
import { Alert, Platform, StyleSheet, TouchableOpacity } from 'react-native'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'

export default function SettingsScreen() {
    const connections = usePersistedStore((state) => state.connections)
    const switchConnection = usePersistedStore((state) => state.switchConnection)
    const currentConnection = usePersistedStore((state) => state.currentConnection)
    const removeConnection = usePersistedStore((state) => state.removeConnection)

    const endpointListQueries = useQueries({
        queries: connections.map((connection) => ({
            queryKey: ['endpoints', connection.id],
            queryFn: async () => {
                const endpoints = await fetchEndpoints({ connectionId: connection.id })
                return { endpoints, connectionId: connection.id }
            },
        })),
    })
    const endpointsWithConnectionId = useMemo(
        () => endpointListQueries.map((query) => query.data),
        [endpointListQueries]
    )

    const backupConfigMutation = useMutation({
        mutationFn: async (password?: string) => {
            const base64Data = await backupConfig(password)

            if (!base64Data) {
                throw new Error('No data returned')
            }

            return base64Data
        },
        onSuccess: async (base64Data: string) => {
            // Check if sharing is available (should be available on both iOS and Android)
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
            console.error('Config backup failed', error)
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

                {endpointsWithConnectionId.map((endpointWithConnectionId) => {
                    if (!endpointWithConnectionId) return null

                    if (
                        !('endpoints' in endpointWithConnectionId) ||
                        !('connectionId' in endpointWithConnectionId)
                    ) {
                        return null
                    }

                    const { endpoints, connectionId } = endpointWithConnectionId

                    return (
                        <View style={styles.card} key={connectionId}>
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

                                    {currentConnection?.currentEndpointId ===
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
                                                    onPress: (password) => {
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
                    if (__DEV__) {
                        router.push('/login')
                        WidgetKitModule.setIsSubscribed(true)
                        return
                    }

                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

                    Superwall.shared
                        .register({
                            placement: 'AddConnection',
                            feature: () => {
                                router.push('/login')
                                WidgetKitModule.setIsSubscribed(true)
                            },
                        })
                        .catch((error) => {
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
