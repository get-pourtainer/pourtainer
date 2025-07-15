import { fetchContainers } from '@/api/queries'
import { usePersistedStore } from '@/stores/persisted'
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import type { Container } from '@/types/container'
import { useQuery } from '@tanstack/react-query'
import { router, useNavigation } from 'expo-router'
import { SquircleButton } from 'expo-squircle-view'
import * as StoreReview from 'expo-store-review'
import ms from 'ms'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { StyleSheet } from 'react-native'
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native'

type GroupedContainers = {
    [key: string]: Container[]
}

function ContainerBox({ container }: { container: Container }) {
    const countToReviewPrompt = usePersistedStore((state) => state.countToReviewPrompt)
    const setCountToReviewPrompt = usePersistedStore((state) => state.setCountToReviewPrompt)
    const lastShownReviewPrompt = usePersistedStore((state) => state.lastShownReviewPrompt)
    const setLastShownReviewPrompt = usePersistedStore((state) => state.setLastShownReviewPrompt)

    const status = container.State.toLowerCase()
    const statusColor =
        status === 'running'
            ? COLORS.status.success
            : status === 'exited'
              ? COLORS.status.error
              : COLORS.status.warning

    const handlePress = useCallback(() => {
        router.push(`/container/${container.Id}`)

        if (countToReviewPrompt === 0) {
            // make sure at least 1 day has passed
            if (!lastShownReviewPrompt || lastShownReviewPrompt < Date.now() - ms('1d')) {
                setLastShownReviewPrompt(Date.now())
                setCountToReviewPrompt(12)
                StoreReview.requestReview()
            }
        } else {
            setCountToReviewPrompt(countToReviewPrompt - 1)
        }
    }, [
        countToReviewPrompt,
        lastShownReviewPrompt,
        setCountToReviewPrompt,
        setLastShownReviewPrompt,
        container.Id,
    ])

    return (
        <SquircleButton onPress={handlePress} style={styles.containerBox}>
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
        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Search stacks or containers...',
                hideWhenScrolling: true,
                barTintColor: COLORS.searchBar.background,
                textColor: COLORS.searchBar.text,
                placeholderTextColor: COLORS.searchBar.placeholder,
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

const styles = StyleSheet.create({
    containerBox: StyleSheet.flatten([
        {
            width: 160,
            height: 150,
            padding: SPACING.md,
            borderRadius: BORDER_RADIUS.lg,
            backgroundColor: COLORS.background.card,
            margin: SPACING.sm,
        },
        SHADOWS.small,
    ]),
    containerBoxInner: {
        flex: 1,
        justifyContent: 'space-between',
    },
    containerName: StyleSheet.flatten([
        TYPOGRAPHY.subtitle,
        {
            color: COLORS.text.primary,
        },
    ]),
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    statusDot: {
        width: SPACING.sm,
        height: SPACING.sm,
        borderRadius: BORDER_RADIUS.circle(SPACING.sm),
    },
    statusText: StyleSheet.flatten([
        TYPOGRAPHY.small,
        {
            color: COLORS.text.secondary,
        },
    ]),
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background.list,
    },
    loadingIndicator: {
        color: COLORS.text.white,
    },
    errorText: {
        color: COLORS.text.primary,
    },
    scrollView: {
        flex: 1,
        backgroundColor: COLORS.background.list,
    },
    scrollViewContent: {
        padding: SPACING.md,
        gap: SPACING.lg,
        position: 'relative',
        borderTopWidth: 1,
        borderTopColor: COLORS.primaryLight,
    },
    noResultsContainer: {
        alignItems: 'center',
        padding: SPACING.lg,
    },
    noResultsText: {
        fontSize: TYPOGRAPHY.subtitle.fontSize,
        color: COLORS.text.light,
    },
    stackName: StyleSheet.flatten([
        TYPOGRAPHY.title,
        SHADOWS.text,
        {
            color: COLORS.text.white,
            marginBottom: SPACING.sm,
        },
    ]),
    containersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -SPACING.sm,
        justifyContent: 'flex-start',
    },
})
