import { fetchContainers } from '@/api/queries'
import type { Container } from '@/types/container'
import { useQuery } from '@tanstack/react-query'
import { router, useNavigation } from 'expo-router'
import { SquircleButton } from 'expo-squircle-view'
import { useLayoutEffect, useMemo, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'

type GroupedContainers = {
    [key: string]: Container[]
}

function ContainerBox({ container }: { container: Container }) {
    const colors = UnistylesRuntime.getTheme().colors
    const status = container.State.toLowerCase()
    const statusColor =
        status === 'running'
            ? colors.status.success
            : status === 'exited'
                ? colors.status.error
                : colors.status.warning

    return (
        <SquircleButton
            onPress={() => router.push(`/container/${container.Id}`)}
            style={styles.containerBox}
        >
            <View style={styles.containerBoxInner}>
                <View>
                    <Text style={styles.containerName} numberOfLines={2}>
                        {container.Names[0].replace(/^\//, '')}
                    </Text>
                </View>

                <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={styles.statusText}>
                        {container.State.charAt(0).toUpperCase() + container.State.slice(1)}
                    </Text>
                </View>
            </View>
        </SquircleButton>
    )
}

export default function ContainersScreen() {
    const [searchQuery, setSearchQuery] = useState('')
    const navigation = useNavigation()

    const containersQuery = useQuery({
        queryKey: ['containers'],
        queryFn: fetchContainers,
    })

    useLayoutEffect(() => {
        const theme = UnistylesRuntime.getTheme()

        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Search stacks or containers...',
                hideWhenScrolling: true,
                barTintColor: theme.colors.searchBar.background,
                textColor: theme.colors.searchBar.text,
                placeholderTextColor: theme.colors.searchBar.placeholder,
                onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
            },
        })
    }, [navigation])

    const filteredGroupedContainers = useMemo(() => {
        if (!containersQuery.data) return {}
        const query = searchQuery.toLowerCase().trim()

        // If no search query, return all containers grouped
        const containers = query
            ? containersQuery.data.filter((container) => {
                  const containerName = container.Names[0].toLowerCase()
                  const stackName = (
                      container.Labels?.['com.docker.compose.project'] || 'Stackless'
                  ).toLowerCase()
                  return containerName.includes(query) || stackName.includes(query)
              })
            : containersQuery.data

        // Group containers
        const groups = containers.reduce<GroupedContainers>((groups, container) => {
            const stackName = container.Labels?.['com.docker.compose.project'] || 'Stackless'
            if (!groups[stackName]) groups[stackName] = []
            groups[stackName].push(container)
            return groups
        }, {})

        // If there's an Stackless category, move it to a separate object
        const { Stackless, ...stackGroups } = groups

        // Return sorted groups with Stackless at the end if it exists
        return {
            ...stackGroups,
            ...(Stackless ? { Stackless } : {}),
        }
    }, [containersQuery.data, searchQuery])

    if (containersQuery.isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={styles.loadingIndicator.color} />
            </View>
        )
    }

    if (containersQuery.error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Error loading data</Text>
            </View>
        )
    }

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
                <RefreshControl
                    refreshing={containersQuery.isRefetching}
                    onRefresh={containersQuery.refetch}
                />
            }
        >
            {Object.keys(filteredGroupedContainers).length === 0 && searchQuery.trim() !== '' && (
                <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                        No containers or stacks match your search
                    </Text>
                </View>
            )}

            {Object.entries(filteredGroupedContainers).map(([stackName, containers]) => (
                <View key={stackName}>
                    <Text style={styles.stackName}>{stackName}</Text>
                    <View style={styles.containersGrid}>
                        {containers.map((container) => (
                            <ContainerBox key={container.Id} container={container} />
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    )
}

const styles = StyleSheet.create((theme) => ({
    containerBox: StyleSheet.flatten([
        {
            width: 160,
            height: 150,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.background.card,
            margin: theme.spacing.sm,
        },
        theme.shadows.small,
    ]),
    containerBoxInner: {
        flex: 1,
        justifyContent: 'space-between',
    },
    containerName: StyleSheet.flatten([
        theme.typography.subtitle,
        {
            color: theme.colors.text.primary,
        },
    ]),
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    statusDot: {
        width: theme.spacing.sm,
        height: theme.spacing.sm,
        borderRadius: theme.borderRadius.circle(theme.spacing.sm),
    },
    statusText: StyleSheet.flatten([
        theme.typography.small,
        {
            color: theme.colors.text.secondary,
        },
    ]),
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.list,
    },
    loadingIndicator: {
        color: theme.colors.text.white,
    },
    errorText: {
        color: theme.colors.text.primary,
    },
    scrollView: {
        flex: 1,
        backgroundColor: theme.colors.background.list,
    },
    scrollViewContent: {
        padding: theme.spacing.md,
        gap: theme.spacing.lg,
        position: 'relative',
        borderTopWidth: 1,
        borderTopColor: theme.colors.primaryLight,
    },
    noResultsContainer: {
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    noResultsText: {
        fontSize: theme.typography.subtitle.fontSize,
        color: theme.colors.text.light,
    },
    stackName: StyleSheet.flatten([
        theme.typography.title,
        theme.shadows.text,
        {
            color: theme.colors.text.white,
            marginBottom: theme.spacing.sm,
        },
    ]),
    containersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.sm,
        justifyContent: 'flex-start',
    },
}))
