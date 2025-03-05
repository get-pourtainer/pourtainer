import { fetchEndpoints } from '@/api/queries'
import { storage } from '@/lib/storage'
import { useAuthStore } from '@/stores/auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import WidgetKitModule from '@/widgetkit'

export default function SettingsScreen() {
    const queryClient = useQueryClient()
    const { instances, removeInstance, currentEndpointId, setCurrentEndpointId } = useAuthStore()
    const theme = UnistylesRuntime.getTheme()

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

        for (const instance of instances) {
            removeInstance(instance.id)
        }

        queryClient.clear()
        WidgetKitModule.clearAllInstances()
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
                            <ActivityIndicator size="small" color={theme.colors.text.primary} />
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Failed to load endpoints</Text>
                        </View>
                    ) : (
                        endpoints?.map((endpoint, endpointIndex) => (
                            <Pressable
                                key={endpoint.Id}
                                onPress={() => setCurrentEndpointId(endpoint.Id.toString())}
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

                                {currentEndpointId === endpoint.Id.toString() && (
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

const styles = StyleSheet.create(theme => ({
    scrollView: {
        flex: 1,
        backgroundColor: theme.colors.background.list
    },
    scrollViewContent: {
        padding: theme.spacing.md,
        gap: theme.spacing.lg,
        position: 'relative',
        borderTopWidth: 1,
        borderTopColor: theme.colors.primaryLight
    },
    section: {
        gap: theme.spacing.md
    },
    sectionTitle: StyleSheet.flatten([
        theme.typography.title,
        {
            color: theme.colors.text.white,
        },
    ]),
    card: StyleSheet.flatten([
        {
            backgroundColor: theme.colors.background.card,
            borderRadius: theme.borderRadius.lg,
            overflow: 'hidden',
        },
        theme.shadows.small,
    ]),
    loadingContainer: {
        padding: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        padding: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    endpointItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.form.input.border,
    },
    endpointContent: {
        flex: 1,
        gap: theme.spacing.xs,
    },
    endpointName: StyleSheet.flatten([
        theme.typography.subtitle,
        {
            color: theme.colors.text.primary,
        },
    ]),
    endpointUrl: StyleSheet.flatten([
        theme.typography.small,
        {
            color: theme.colors.text.secondary,
        },
    ]),
    activeIndicator: {
        width: 24,
        height: 24,
        borderRadius: theme.borderRadius.circle(24),
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        color: theme.colors.text.white,
        fontSize: 14,
        fontWeight: 'bold',
    },
    actionButton: {
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.form.input.border,
    },
    actionButtonText: StyleSheet.flatten([
        theme.typography.subtitle,
        {
            color: theme.colors.text.primary,
        },
    ]),
    logoutButton: {
        borderBottomWidth: 0,
    },
    logoutText: {
        color: theme.colors.status.error,
    },
    errorText: StyleSheet.flatten([
        theme.typography.subtitle,
        {
            color: theme.colors.status.error,
        },
    ]),
}))
