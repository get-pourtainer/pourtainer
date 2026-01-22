import {
    killContainer,
    pauseContainer,
    restartContainer,
    startContainer,
    stopContainer,
    unpauseContainer,
} from '@/api/mutations'
import { fetchContainers, fetchStacks } from '@/api/queries'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import type { components } from '@/lib/docker/schema'
import { usePersistedStore } from '@/stores/persisted'
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import * as QuickActions from 'expo-quick-actions'
import { router, useNavigation } from 'expo-router'
import { SquircleButton } from 'expo-squircle-view'
import * as StoreReview from 'expo-store-review'
import { usePlacement, useSuperwall, useUser } from 'expo-superwall'
import ms from 'ms'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, TouchableOpacity } from 'react-native'
import { ScrollView, Text, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

type GroupedContainers = {
    [key: string]: components['schemas']['ContainerSummary'][]
}

function ContainerBox({
    container,
    isSelectionMode,
    isSelected,
    onToggleSelect,
}: {
    container: components['schemas']['ContainerSummary']
    isSelectionMode: boolean
    isSelected: boolean
    onToggleSelect: () => void
}) {
    const countToReviewPrompt = usePersistedStore((state) => state.countToReviewPrompt)
    const setCountToReviewPrompt = usePersistedStore((state) => state.setCountToReviewPrompt)
    const lastShownReviewPrompt = usePersistedStore((state) => state.lastShownReviewPrompt)
    const setLastShownReviewPrompt = usePersistedStore((state) => state.setLastShownReviewPrompt)

    const status = container.State?.toLowerCase() || 'unknown'
    const statusColor =
        status === 'running' ? COLORS.success : status === 'exited' ? COLORS.error : COLORS.warning

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

        if (isSelectionMode) {
            onToggleSelect()
            return
        }

        router.push(`/container/${container.Id}/`)

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
        isSelectionMode,
        onToggleSelect,
        countToReviewPrompt,
        lastShownReviewPrompt,
        setCountToReviewPrompt,
        setLastShownReviewPrompt,
        container.Id,
    ])

    return (
        <SquircleButton
            onPress={handlePress}
            style={[styles.containerBox, isSelected && styles.containerBoxSelected]}
        >
            <View style={styles.containerBoxInner}>
                <View>
                    <Text
                        style={[styles.containerName, isSelected && { color: COLORS.text }]}
                        numberOfLines={2}
                    >
                        {container.Names?.[0]?.replace(/^\//, '') || 'Unnamed container'}
                    </Text>
                </View>

                <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, isSelected && { color: COLORS.text }]}>
                        {container.State?.charAt(0).toUpperCase() +
                            (container.State?.slice(1) || '')}
                    </Text>
                </View>
            </View>
        </SquircleButton>
    )
}

export default function ContainersScreen() {
    const { registerPlacement } = usePlacement()
    const { subscriptionStatus } = useUser()
    const { getPresentationResult } = useSuperwall()
    const [searchQuery, setSearchQuery] = useState('')
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedContainers, setSelectedContainers] = useState<Set<string>>(new Set())
    const navigation = useNavigation()

    const containersQuery = useQuery({
        queryKey: ['containers'],
        queryFn: fetchContainers,
    })

    const stacksQuery = useQuery({
        queryKey: ['stacks'],
        queryFn: fetchStacks,
    })

    // Create a lookup map from stack name to stack ID
    const stackNameToIdMap = useMemo(() => {
        if (!stacksQuery.data) return new Map<string, number>()
        return new Map(stacksQuery.data.map((stack) => [stack.Name || '', stack.Id || 0]))
    }, [stacksQuery.data])

    const bulkActionMutation = useMutation({
        mutationFn: async ({
            action,
            containerIds,
        }: {
            action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill'
            containerIds: string[]
        }) => {
            const actionMap = {
                start: startContainer,
                stop: stopContainer,
                restart: restartContainer,
                pause: pauseContainer,
                unpause: unpauseContainer,
                kill: killContainer,
            }

            const actionFn = actionMap[action]
            const promises = containerIds.map((id) => actionFn(id))
            await Promise.all(promises)
        },
        onSuccess: () => {
            containersQuery.refetch()
            setIsSelectionMode(false)
            setSelectedContainers(new Set())
        },
    })

    const handleToggleSelect = useCallback((containerId: string) => {
        setSelectedContainers((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(containerId)) {
                newSet.delete(containerId)
            } else {
                newSet.add(containerId)
            }
            return newSet
        })
    }, [])

    const handleBulkAction = useCallback(
        (action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill') => {
            const containerIds = Array.from(selectedContainers)
            const actionLabel = action.charAt(0).toUpperCase() + action.slice(1)

            bulkActionMutation.mutate(
                { action, containerIds },
                {
                    onSuccess: () => {
                        Alert.alert(
                            'Success',
                            `${actionLabel} completed for ${containerIds.length} container${containerIds.length !== 1 ? 's' : ''}`
                        )
                    },
                    onError: (error) => {
                        Alert.alert('Error', `Failed to ${action} some containers`)
                        console.error(error)
                    },
                }
            )
        },
        [selectedContainers, bulkActionMutation]
    )

    const filteredGroupedContainers = useMemo(() => {
        if (!containersQuery.data) return []
        const query = searchQuery.toLowerCase().trim()

        // If no search query, return all containers grouped
        const containers = query
            ? containersQuery.data.filter((container) => {
                  const containerName = container.Names?.[0]?.toLowerCase() ?? 'Unnamed container'
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
        const mapResult = {
            ...stackGroups,
            ...(Stackless ? { Stackless } : {}),
        }

        return Object.entries(mapResult)
    }, [containersQuery.data, searchQuery])

    const Placeholder = useMemo(() => {
        const isSearch = searchQuery.trim() !== ''

        const emptyContainers = buildPlaceholder({
            isLoading: containersQuery.isLoading,
            isError: containersQuery.isError,
            hasData: filteredGroupedContainers.length > 0,
            emptyLabel: isSearch
                ? 'No containers or stacks match your search'
                : 'No containers found',
            errorLabel: 'Error loading containers',
        })

        return emptyContainers
    }, [
        containersQuery.isLoading,
        containersQuery.isError,
        filteredGroupedContainers.length,
        searchQuery,
    ])

    useEffect(() => {
        if (subscriptionStatus.status !== 'INACTIVE') {
            QuickActions.isSupported().then((supported) => {
                if (!supported) return
                QuickActions.setItems(
                    Platform.OS === 'ios'
                        ? [
                              {
                                  id: '0',
                                  title: 'Bugs?',
                                  subtitle: 'Open an issue on GitHub!',
                                  icon: 'mail',
                              },
                          ]
                        : []
                )
            })
            return
        }

        try {
            getPresentationResult('LifetimeOffer_1').then((presentationResult) => {
                if (
                    ['placementnotfound', 'noaudiencematch'].includes(
                        presentationResult.type.toLowerCase()
                    )
                ) {
                    return
                }
                setTimeout(() => {
                    registerPlacement({
                        placement: 'LifetimeOffer_1',
                        feature: () => {
                            Alert.alert('Congrats!', 'You unlocked lifetime access to Pourtainer.')
                        },
                    }).catch((error) => {
                        Sentry.captureException(error)
                        console.error('Error registering LifetimeOffer_1', error)
                    })
                }, 1000)
            })

            QuickActions.isSupported().then((supported) => {
                if (!supported) return
                QuickActions.setItems([
                    {
                        id: '0',
                        title:
                            Platform.OS === 'android'
                                ? "Don't delete me ): Tap here!"
                                : "Don't delete me ):",
                        subtitle: "Here's 50% off for life!",
                        icon: 'love',
                        params: { href: '/?showLfo1=1' },
                    },
                ])
            })
        } catch (error) {
            Sentry.captureException(error)
        }
    }, [registerPlacement, subscriptionStatus.status, getPresentationResult])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () =>
                isSelectionMode ? (
                    <ContextMenu
                        dropdownMenuMode={true}
                        actions={[
                            {
                                title: 'Stop',
                                destructive: true,
                                systemIcon: 'stop.fill',
                            },
                            {
                                title: 'Kill',
                                destructive: true,
                                systemIcon: 'stop.fill',
                            },
                            {
                                title: 'Restart',
                                destructive: true,
                                systemIcon: 'clock.arrow.2.circlepath',
                            },
                            {
                                title: 'Resume',
                                systemIcon: 'play.fill',
                            },
                            {
                                title: 'Pause',
                                systemIcon: 'pause.fill',
                            },
                            {
                                title: 'Start',
                                systemIcon: 'play.fill',
                            },
                            {
                                title: 'Deselect',
                                systemIcon: 'xmark.circle.fill',
                            },
                        ]}
                        onPress={(e) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

                            if (e.nativeEvent.name.startsWith('Start')) {
                                handleBulkAction('start')
                            } else if (e.nativeEvent.name.startsWith('Pause')) {
                                handleBulkAction('pause')
                            } else if (e.nativeEvent.name.startsWith('Resume')) {
                                handleBulkAction('unpause')
                            } else if (e.nativeEvent.name.startsWith('Restart')) {
                                Alert.alert(
                                    'Restart Containers',
                                    `Are you sure you want to restart ${selectedContainers.size} containers?`,
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel',
                                        },
                                        {
                                            text: 'Restart',
                                            onPress: () => handleBulkAction('restart'),
                                        },
                                    ]
                                )
                            } else if (e.nativeEvent.name.startsWith('Stop')) {
                                Alert.alert(
                                    'Stop Containers',
                                    `Are you sure you want to stop ${selectedContainers.size} containers?`,
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel',
                                        },
                                        {
                                            text: 'Stop',
                                            onPress: () => handleBulkAction('stop'),
                                        },
                                    ]
                                )
                            } else if (e.nativeEvent.name.startsWith('Kill')) {
                                Alert.alert(
                                    'Kill Containers',
                                    `Are you sure you want to kill ${selectedContainers.size} containers?`,
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel',
                                        },
                                        {
                                            text: 'Kill',
                                            onPress: () => handleBulkAction('kill'),
                                        },
                                    ]
                                )
                            } else if (e.nativeEvent.name === 'Deselect') {
                                setIsSelectionMode(false)
                                setSelectedContainers(new Set())
                            }
                        }}
                    >
                        <Pressable
                            disabled={bulkActionMutation.isPending}
                            style={({ pressed }) => [
                                styles.headerButton,
                                pressed && styles.headerButtonPressed,
                                isLiquidGlassAvailable()
                                    ? {
                                          alignItems: 'center',
                                          display: 'flex',
                                          justifyContent: 'center',
                                          width: 36,
                                          height: 36,
                                          paddingHorizontal: 0,
                                          paddingVertical: 0,
                                          marginRight: 0,
                                      }
                                    : undefined,
                            ]}
                        >
                            {bulkActionMutation.isPending ? (
                                <ActivityIndicator size="small" />
                            ) : (
                                <Ionicons
                                    name={'ellipsis-horizontal'}
                                    size={32}
                                    style={{ margin: 0, padding: 0 }}
                                    color={COLORS.primary}
                                />
                            )}
                        </Pressable>
                    </ContextMenu>
                ) : (
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            setIsSelectionMode(true)
                        }}
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.headerButtonPressed,
                            isLiquidGlassAvailable()
                                ? {
                                      alignItems: 'center',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      width: 36,
                                      height: 36,
                                      paddingHorizontal: 0,
                                      paddingVertical: 0,
                                      marginRight: 0,
                                  }
                                : undefined,
                        ]}
                    >
                        <Ionicons
                            name={'checkmark-outline'}
                            size={32}
                            style={{ margin: 0, padding: 0 }}
                            color={COLORS.primary}
                        />
                    </Pressable>
                ),
            headerSearchBarOptions: {
                placeholder: 'Search stacks or containers...',
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
    }, [
        navigation,
        isSelectionMode,
        selectedContainers.size,
        handleBulkAction,
        bulkActionMutation.isPending,
    ])

    if (Placeholder) {
        return Placeholder
    }

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={containersQuery.refetch} />}
            showsVerticalScrollIndicator={false}
        >
            {filteredGroupedContainers.map(([stackName, containers]) => {
                const stackId = stackNameToIdMap.get(stackName)
                const hasStack = stackId && stackName !== 'Stackless'

                return (
                    <View key={stackName}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                            disabled={!hasStack}
                            onPress={() => {
                                if (!hasStack) return
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                router.push(`/stacks/${stackId}/home/`)
                            }}
                        >
                            <Text style={styles.stackName}>{stackName}</Text>
                            {hasStack && (
                                <Ionicons
                                    name="chevron-forward"
                                    size={18}
                                    color={COLORS.textMuted}
                                    style={{ marginBottom: 7 }}
                                />
                            )}
                        </TouchableOpacity>
                        <View style={styles.containersGrid}>
                            {containers.map((container) => (
                                <ContainerBox
                                    key={container.Id}
                                    container={container}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedContainers.has(container.Id || '')}
                                    onToggleSelect={() => handleToggleSelect(container.Id || '')}
                                />
                            ))}
                        </View>
                    </View>
                )
            })}
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
            backgroundColor: COLORS.bgSecondary,
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
            color: COLORS.primary,
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
            color: COLORS.textMuted,
        },
    ]),
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingIndicator: {
        color: COLORS.text,
    },
    errorText: {
        color: COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: SPACING.md,
        gap: SPACING.lg,
        position: 'relative',
    },
    noResultsContainer: {
        alignItems: 'center',
        padding: SPACING.lg,
    },
    noResultsText: {
        fontSize: TYPOGRAPHY.subtitle.fontSize,
        color: COLORS.textMuted,
    },
    stackName: StyleSheet.flatten([
        TYPOGRAPHY.title,
        SHADOWS.text,
        {
            color: COLORS.text,
            marginBottom: SPACING.sm,
        },
    ]),
    containersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -SPACING.sm,
        justifyContent: 'flex-start',
    },
    containerBoxSelected: {
        backgroundColor: COLORS.primary,
    },
    headerButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        marginRight: SPACING.xs,
    },
    headerButtonPressed: {
        opacity: 0.6,
    },
    headerButtonText: StyleSheet.flatten([
        TYPOGRAPHY.body,
        {
            color: COLORS.primary,
            fontWeight: '600',
        },
    ]),
})
