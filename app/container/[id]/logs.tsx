import { fetchLogs } from '@/api/queries'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import debounce from 'lodash/debounce'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    type LayoutChangeEvent,
    Modal,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { StyleSheet } from 'react-native-unistyles'

type LogOptions = {
    timestamps: boolean
    tail: number
    since: string // Human readable format
}

// Convert human-readable time to timestamp
const sinceOptions = [
    { label: '15 min', value: '15m' },
    { label: '1 hour', value: '1h' },
    { label: '3 hours', value: '3h' },
    { label: '12 hours', value: '12h' },
    { label: '1 day', value: '1d' },
    { label: 'All', value: '0' },
]

// Move the time conversion map outside the component
const sinceMap: Record<string, number> = {
    '15m': 15 * 60,
    '1h': 60 * 60,
    '3h': 3 * 60 * 60,
    '12h': 12 * 60 * 60,
    '1d': 24 * 60 * 60,
    '0': 0,
}

export default function ContainerLogsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const [options, setOptions] = useState<LogOptions>({
        timestamps: true,
        tail: 1000,
        since: '1h',
    })

    // Convert the human-readable time to seconds before passing to query
    const sinceSeconds = sinceMap[options.since] || 0

    const logsQuery = useQuery({
        queryKey: ['container-logs', id, options],
        queryFn: () =>
            fetchLogs(id, {
                timestamps: options.timestamps,
                tail: options.tail,
                since: sinceSeconds,
            }),
        staleTime: 5000,
        refetchInterval: 5000,
        refetchIntervalInBackground: false,
    })

    const [showPeriodPicker, setShowPeriodPicker] = useState(false)

    // Add opacity animation value
    const controlsOpacity = useRef(new Animated.Value(1)).current

    // Add refs for scroll tracking
    const lastScrollY = useRef(0)
    const scrollViewRef = useRef<ScrollView>(null)
    const [contentHeight, setContentHeight] = useState(0)
    const [containerHeight, setContainerHeight] = useState(0)

    // Memoize animation config
    const animationConfig = useMemo(
        () => ({
            duration: 150,
            useNativeDriver: true,
        }),
        []
    )

    // Memoize the animation function
    const animateOpacity = useCallback(
        (toValue: number) => {
            Animated.timing(controlsOpacity, {
                toValue,
                ...animationConfig,
            }).start()
        },
        [controlsOpacity, animationConfig]
    )

    // Debounced scroll handler
    const debouncedAnimate = useRef(
        debounce(
            (isScrollingDown: boolean) => {
                animateOpacity(isScrollingDown ? 0.3 : 1)
            },
            100,
            { leading: true, trailing: true }
        )
    ).current

    // Clean up debounce on unmount
    useEffect(() => {
        return () => {
            debouncedAnimate.cancel()
        }
    }, [debouncedAnimate])

    // Optimized scroll handler
    const handleScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const currentScrollY = event.nativeEvent.contentOffset.y
            const threshold = 10

            if (
                currentScrollY < 0 ||
                contentHeight <= containerHeight ||
                Math.abs(currentScrollY - lastScrollY.current) < threshold
            ) {
                return
            }

            const isScrollingDown = currentScrollY > lastScrollY.current
            lastScrollY.current = currentScrollY

            debouncedAnimate(isScrollingDown)
        },
        [contentHeight, containerHeight, debouncedAnimate]
    )

    // Memoize layout handlers
    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height)
    }, [])

    const handleContentSizeChange = useCallback((_: number, height: number) => {
        setContentHeight(height)
    }, [])

    // Memoize options handlers
    const handleTimestampToggle = useCallback(() => {
        setOptions((prev) => ({
            ...prev,
            timestamps: !prev.timestamps,
        }))
    }, [])

    const handleTailChange = useCallback((text: string) => {
        setOptions((prev) => ({
            ...prev,
            tail: Number.parseInt(text) || 1000,
        }))
    }, [])

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
            {/* Main container with relative positioning */}
            <View style={{ flex: 1 }}>
                {/* Logs Area - Full height */}
                <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
                    {logsQuery.isLoading ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <ActivityIndicator size="large" color="#00ff00" />
                        </View>
                    ) : logsQuery.error || !logsQuery.data ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#ff0000' }}>Error loading logs</Text>
                        </View>
                    ) : (
                        <ScrollView
                            ref={scrollViewRef}
                            style={{ padding: 12 }}
                            onScroll={handleScroll}
                            scrollEventThrottle={32}
                            onLayout={handleLayout}
                            onContentSizeChange={handleContentSizeChange}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        >
                            {logsQuery.data.split('\n').map((log, index) => (
                                <Text
                                    key={index}
                                    style={{
                                        color: '#00ff00',
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        lineHeight: 20,
                                        marginBottom: 2,
                                    }}
                                >
                                    {log}
                                </Text>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Controls Panel - Absolute positioning */}
                <Animated.View
                    style={[
                        styles.controls,
                        {
                            opacity: controlsOpacity,
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                        },
                    ]}
                >
                    <View style={styles.controlsRow}>
                        {/* Timestamps Control */}
                        <View style={styles.controlGroup}>
                            <Text style={[styles.baseText, styles.controlLabel]}>Timestamps</Text>
                            <TouchableOpacity
                                style={styles.baseControl}
                                onPress={handleTimestampToggle}
                            >
                                <Text style={[styles.baseText, styles.controlText]}>
                                    {options.timestamps ? 'Hide' : 'Show'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Lines Control */}
                        <View style={styles.controlGroup}>
                            <Text style={[styles.baseText, styles.controlLabel]}>Lines</Text>
                            <View style={styles.baseControl}>
                                <TextInput
                                    style={[
                                        styles.baseText,
                                        styles.controlText,
                                        { width: '100%', height: '100%' },
                                    ]}
                                    value={options.tail.toString()}
                                    onChangeText={handleTailChange}
                                    keyboardType="numeric"
                                    returnKeyType="done"
                                    blurOnSubmit={true}
                                    enablesReturnKeyAutomatically={true}
                                    autoComplete="off"
                                    autoCorrect={false}
                                    spellCheck={false}
                                />
                            </View>
                        </View>

                        {/* Period Control */}
                        <View style={styles.controlGroup}>
                            <Text style={[styles.baseText, styles.controlLabel]}>Period</Text>
                            <TouchableOpacity
                                style={styles.baseControl}
                                onPress={() => setShowPeriodPicker(true)}
                            >
                                <Text style={[styles.baseText, styles.controlText]}>
                                    {sinceOptions.find((opt) => opt.value === options.since)?.label}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* Time Period Picker Modal */}
                <Modal
                    visible={showPeriodPicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowPeriodPicker(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowPeriodPicker(false)}
                    >
                        <View style={styles.modalContent}>
                            {sinceOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.periodOption,
                                        options.since === option.value && styles.periodOptionActive,
                                    ]}
                                    onPress={() => {
                                        setOptions((prev) => ({ ...prev, since: option.value }))
                                        setShowPeriodPicker(false)
                                    }}
                                >
                                    <Text style={[styles.baseText, styles.periodOptionText]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create((_, rt) => ({
    // Layout containers
    controls: {
        backgroundColor: '#2a2a2a',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#3a3a3a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        paddingBottom: rt.insets.bottom
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    controlGroup: {
        flex: 1,
    },

    // Base styles for interactive elements
    baseControl: {
        backgroundColor: '#3a3a3a',
        height: 36,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },

    // Text styles
    baseText: {
        color: '#00ff00',
    },
    controlLabel: {
        fontSize: 12,
        marginBottom: 4,
        opacity: 0.8,
    },
    controlText: {
        fontSize: 13,
        textAlign: 'center',
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 8,
        width: '80%',
        maxWidth: 300,
    },
    periodOption: {
        padding: 12,
        borderRadius: 6,
    },
    periodOptionActive: {
        backgroundColor: '#4a4a4a',
    },
    periodOptionText: {
        fontSize: 14,
        textAlign: 'center',
    },
}))
