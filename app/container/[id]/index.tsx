import React from 'react'
import {
    killContainer,
    pauseContainer,
    restartContainer,
    startContainer,
    stopContainer,
    unpauseContainer,
} from '@/api/mutations'
import { fetchContainers } from '@/api/queries'
import type { Container } from '@/types/container'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useRouter } from 'expo-router'
import { Stack } from 'expo-router'
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'

export default function ContainerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    const queryClient = useQueryClient()

    const containersQuery = useQuery<Container[]>({
        queryKey: ['containers'],
        queryFn: fetchContainers,
    })

    const restartMutation = useMutation({
        mutationFn: restartContainer,
        onSuccess: () => {
            // Invalidate and refetch containers query to get updated state
            queryClient.invalidateQueries({ queryKey: ['containers'] })
        },
    })

    const startMutation = useMutation({
        mutationFn: startContainer,
        onSuccess: () => {
            // Immediately update the local cache
            queryClient.setQueryData<Container[]>(['containers'], (old) =>
                old?.map((c) => (c.Id === id ? { ...c, State: 'running' } : c))
            )
            // Then trigger background refetch
            queryClient.invalidateQueries({ queryKey: ['containers'] })
        },
    })

    const stopMutation = useMutation({
        mutationFn: stopContainer,
        onSuccess: () => {
            queryClient.setQueryData<Container[]>(['containers'], (old) =>
                old?.map((c) => (c.Id === id ? { ...c, State: 'exited' } : c))
            )
            queryClient.invalidateQueries({ queryKey: ['containers'] })
        },
    })

    const pauseMutation = useMutation({
        mutationFn: pauseContainer,
        onSuccess: () => {
            queryClient.setQueryData<Container[]>(['containers'], (old) =>
                old?.map((c) => (c.Id === id ? { ...c, State: 'paused' } : c))
            )
            queryClient.invalidateQueries({ queryKey: ['containers'] })
        },
    })

    const unpauseMutation = useMutation({
        mutationFn: unpauseContainer,
        onSuccess: () => {
            queryClient.setQueryData<Container[]>(['containers'], (old) =>
                old?.map((c) => (c.Id === id ? { ...c, State: 'running' } : c))
            )
            queryClient.invalidateQueries({ queryKey: ['containers'] })
        },
    })

    const killMutation = useMutation({
        mutationFn: killContainer,
        onSuccess: () => {
            queryClient.setQueryData<Container[]>(['containers'], (old) =>
                old?.map((c) => (c.Id === id ? { ...c, State: 'exited' } : c))
            )
            queryClient.invalidateQueries({ queryKey: ['containers'] })
        },
    })

    if (containersQuery.isLoading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f5f5f5',
                }}
            >
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        )
    }

    if (containersQuery.error || !containersQuery.data) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Error loading container details</Text>
            </View>
        )
    }

    const container = containersQuery.data.find((container) => container.Id === id)

    if (!container) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Container not found</Text>
            </View>
        )
    }

    const theme = UnistylesRuntime.getTheme()

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: container.Names[0].replace(/^\//, ''),
                    headerLargeTitle: true,
                    headerStyle: {
                        backgroundColor: theme.colors.background.list,
                    },
                    headerTintColor: theme.colors.text.white,
                    headerLargeTitleStyle: {
                        color: theme.colors.text.white,
                    },
                    headerShadowVisible: false,
                    headerBackTitle: 'Back',
                }}
            />
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.colors.background.list }}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View style={{ padding: 16, gap: 12 }}>
                    {/* Terminal & Logs Actions */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            style={{
                                backgroundColor: theme.colors.badge.blue.background,
                                padding: 12,
                                borderRadius: 12,
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                            onPress={() => router.push(`/container/${id}/logs`)}
                        >
                            <Ionicons
                                name="document-text-outline"
                                size={20}
                                color={theme.colors.badge.blue.text}
                            />
                            <Text style={{ color: theme.colors.badge.blue.text, fontSize: 17 }}>
                                Logs
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                backgroundColor: theme.colors.badge.purple.background,
                                padding: 12,
                                borderRadius: 12,
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                            onPress={() => router.push(`/container/${id}/terminal`)}
                        >
                            <Ionicons
                                name="terminal-outline"
                                size={20}
                                color={theme.colors.badge.purple.text}
                            />
                            <Text style={{ color: theme.colors.badge.purple.text, fontSize: 17 }}>
                                Terminal
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Status Card */}
                    <View style={styles.card}>
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <View>
                                <Text style={styles.cardLabel}>Status</Text>
                                <View
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                >
                                    <View
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor:
                                                container.State === 'running'
                                                    ? theme.colors.status.success
                                                    : container.State === 'paused'
                                                      ? theme.colors.status.warning
                                                      : theme.colors.status.error,
                                        }}
                                    />
                                    <Text style={styles.statusText}>{container.State}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {container.State === 'running' ? (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert(
                                                    'Stop Container',
                                                    'Are you sure you want to stop this container?',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Stop',
                                                            style: 'destructive',
                                                            onPress: () => stopMutation.mutate(id),
                                                        },
                                                    ]
                                                )
                                            }}
                                            disabled={stopMutation.isPending}
                                            style={{ padding: 4 }}
                                        >
                                            <Ionicons
                                                name="stop-circle-outline"
                                                size={28}
                                                color={
                                                    stopMutation.isPending
                                                        ? theme.colors.text.light
                                                        : theme.colors.actions.error
                                                }
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert(
                                                    'Kill Container',
                                                    'Are you sure you want to force kill this container? This may cause data loss.',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Kill',
                                                            style: 'destructive',
                                                            onPress: () => killMutation.mutate(id),
                                                        },
                                                    ]
                                                )
                                            }}
                                            disabled={killMutation.isPending}
                                            style={{ padding: 4 }}
                                        >
                                            <Ionicons
                                                name="close-circle-outline"
                                                size={28}
                                                color={
                                                    killMutation.isPending
                                                        ? theme.colors.text.light
                                                        : theme.colors.actions.error
                                                }
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert(
                                                    'Pause Container',
                                                    'Are you sure you want to pause this container?',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Pause',
                                                            onPress: () => pauseMutation.mutate(id),
                                                        },
                                                    ]
                                                )
                                            }}
                                            disabled={pauseMutation.isPending}
                                            style={{ padding: 4 }}
                                        >
                                            <Ionicons
                                                name="pause-circle-outline"
                                                size={28}
                                                color={
                                                    pauseMutation.isPending
                                                        ? theme.colors.text.light
                                                        : theme.colors.actions.warning
                                                }
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert(
                                                    'Restart Container',
                                                    'Are you sure you want to restart this container?',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Restart',
                                                            onPress: () =>
                                                                restartMutation.mutate(id),
                                                        },
                                                    ]
                                                )
                                            }}
                                            disabled={restartMutation.isPending}
                                            style={{ padding: 4 }}
                                        >
                                            <Ionicons
                                                name="refresh-circle-outline"
                                                size={28}
                                                color={
                                                    restartMutation.isPending
                                                        ? theme.colors.text.light
                                                        : theme.colors.actions.neutral
                                                }
                                            />
                                        </TouchableOpacity>
                                    </>
                                ) : container.State === 'paused' ? (
                                    <TouchableOpacity
                                        onPress={() => unpauseMutation.mutate(id)}
                                        disabled={unpauseMutation.isPending}
                                        style={{ padding: 4 }}
                                    >
                                        <Ionicons
                                            name="play-circle-outline"
                                            size={28}
                                            color={
                                                startMutation.isPending || unpauseMutation.isPending
                                                    ? theme.colors.text.light
                                                    : theme.colors.actions.success
                                            }
                                        />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => startMutation.mutate(id)}
                                        disabled={startMutation.isPending}
                                        style={{ padding: 4 }}
                                    >
                                        <Ionicons
                                            name="play-circle-outline"
                                            size={28}
                                            color={
                                                startMutation.isPending
                                                    ? theme.colors.text.light
                                                    : theme.colors.actions.success
                                            }
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Info Cards */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Container ID</Text>
                        <Text style={styles.cardText}>{container.Id.substring(0, 12)}</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Image</Text>
                        <Text style={styles.cardText}>{container.Image}</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Created</Text>
                        <Text style={styles.cardText}>
                            {new Date(container.Created * 1000).toLocaleString()}
                        </Text>
                    </View>

                    {/* Network Info Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Network</Text>
                        {Object.entries(container.NetworkSettings.Networks).map(
                            ([networkName, network]) => (
                                <View key={networkName} style={{ marginBottom: 12 }}>
                                    <Text style={styles.cardLabel}>{networkName}</Text>
                                    <Text style={styles.cardText}>IP: {network.IPAddress}</Text>
                                    <Text style={styles.cardText}>Gateway: {network.Gateway}</Text>
                                    {network.MacAddress && (
                                        <Text style={styles.cardText}>
                                            MAC: {network.MacAddress}
                                        </Text>
                                    )}
                                </View>
                            )
                        )}
                    </View>

                    {/* Ports Card */}
                    {container.Ports.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>Port Mappings</Text>
                            {container.Ports.map((port, index) => (
                                <View key={index} style={{ marginBottom: 8 }}>
                                    <Text style={styles.cardText}>
                                        {port.PublicPort ? `${port.PublicPort}:` : ''}
                                        {port.PrivatePort} ({port.Type})
                                        {port.IP ? ` on ${port.IP}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Mounts Card */}
                    {container.Mounts.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>Volumes & Mounts</Text>
                            {container.Mounts.map((mount, index) => (
                                <View key={index} style={{ marginBottom: 12 }}>
                                    <Text style={styles.cardLabel}>
                                        {mount.Name || mount.Source}
                                    </Text>
                                    <Text style={styles.cardText}>→ {mount.Destination}</Text>
                                    <Text style={styles.cardText}>
                                        {mount.Type} ({mount.RW ? 'RW' : 'RO'})
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Command Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Command</Text>
                        <Text style={styles.monospaceText}>{container.Command}</Text>
                    </View>

                    {/* Labels Card */}
                    {Object.entries(container.Labels).filter(([key, value]) =>
                        Boolean(value.trim())
                    ).length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>Labels</Text>
                            {Object.entries(container.Labels)
                                .filter(([key, value]) => Boolean(value.trim()))
                                .map(([key, value]) => (
                                    <View key={key} style={{ marginBottom: 4 }}>
                                        <Text style={styles.labelKey}>{key}</Text>
                                        <Text style={styles.cardText}>{value}</Text>
                                    </View>
                                ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create((theme) => ({
    card: {
        backgroundColor: theme.colors.background.card,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    cardLabel: {
        fontSize: 15,
        color: theme.colors.text.secondary,
        marginBottom: 4,
    },
    cardText: {
        fontSize: 17,
        color: theme.colors.text.primary,
    },
    statusText: {
        fontSize: 17,
        fontWeight: '500',
        textTransform: 'capitalize',
        color: theme.colors.text.primary,
    },
    monospaceText: {
        fontSize: 15,
        fontFamily: 'monospace',
        color: theme.colors.text.primary,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 12,
        marginBottom: 12,
    },
    labelKey: {
        fontSize: 13,
        color: theme.colors.text.secondary,
    },
}))
