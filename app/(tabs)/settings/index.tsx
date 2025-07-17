import { fetchEndpoints } from '@/api/queries'
import { storage } from '@/lib/storage'
import { usePersistedStore } from '@/stores/persisted'
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import WidgetKitModule from '@/widgetkit'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { StyleSheet } from 'react-native'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'

export default function SettingsScreen() {
    const connections = usePersistedStore((state) => state.connections)
    const switchEndpoint = usePersistedStore((state) => state.switchEndpoint)
    const currentConnection = usePersistedStore((state) => state.currentConnection)
    const removeConnection = usePersistedStore((state) => state.removeConnection)

    const queryClient = useQueryClient()

    const {
        data: endpoints,
        isLoading,
        isRefetching,
        error,
        refetch,
    } = useQuery({
        queryKey: ['endpoints'],
        queryFn: fetchEndpoints,
    })

    const handleLogout = async () => {
        router.replace('/login')

        storage.clearAll()

        for (const connection of connections) {
            removeConnection(connection.id)
        }

        queryClient.clear()
        WidgetKitModule.clearAllConnections()
    }

    const handleForceRefresh = () => {
        queryClient.invalidateQueries({
            queryKey: ['containers', 'images', 'volumes', 'endpoints'],
        })
    }

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
                <View style={styles.card}>
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Failed to load endpoints</Text>
                        </View>
                    ) : (
                        endpoints?.map((endpoint, endpointIndex) => (
                            <Pressable
                                key={endpoint.Id}
                                onPress={() => switchEndpoint(endpoint.Id.toString())}
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
                        ))
                    )}
                </View>
            </View>

            {/* Actions Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.card}>
                    <Pressable
                        onPress={handleForceRefresh}
                        style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
                    >
                        <Text style={styles.actionButtonText}>Force Refresh</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleLogout}
                        style={({ pressed }) => [
                            styles.actionButton,
                            styles.logoutButton,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <Text style={[styles.actionButtonText, styles.logoutText]}>Log Out</Text>
                    </Pressable>
                </View>
            </View>
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
    actionButton: {
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.hrPrimary,
    },
    actionButtonText: StyleSheet.flatten([
        TYPOGRAPHY.subtitle,
        {
            color: COLORS.primaryLight,
        },
    ]),
    logoutButton: {
        borderBottomWidth: 0,
    },
    logoutText: {
        color: COLORS.errorLight,
    },
    errorText: StyleSheet.flatten([
        TYPOGRAPHY.subtitle,
        {
            color: COLORS.errorLight,
        },
    ]),
})
