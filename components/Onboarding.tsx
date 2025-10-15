import { BlurView } from 'expo-blur'
import { SquircleView } from 'expo-squircle-view'
import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react'
import {
    Image,
    type ImageSourcePropType,
    Linking,
    Platform,
    ScrollView,
    Text,
    type TextStyle,
    View,
    useWindowDimensions,
} from 'react-native'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type OnboardingFeature = {
    title: string
    description: string
    systemImage: SymbolViewProps['name']
    icon?: ComponentType
    links?: {
        sectionText: string
        sectionUrl: string
    }[]
}

// Animation constants
const ANIMATION_CONFIG = {
    FADE_IN_DURATION: 600,
    MOVE_UP_DURATION: 800,
    FEATURE_DURATION: 750,
    STAGGER_DELAY: 420,
    BUFFER_DELAY: 200,
    INITIAL_SCALE: 0.7,
    BACK_EASING_FACTOR: 1.2,
    FEATURE_TRANSLATE_OFFSET: 42,
    SCREEN_HEIGHT_FACTOR: 0.25,
}

// Text parsing function for links
function parseTextWithLinks(
    description: string,
    links: { sectionText: string; sectionUrl: string }[] = []
): Array<{ type: 'text' | 'link'; content: string; url?: string }> {
    if (!links || links.length === 0) {
        return [{ type: 'text', content: description }]
    }

    // Create array of all link positions in the text
    const linkPositions: Array<{
        start: number
        end: number
        text: string
        url: string
    }> = []

    // Find all occurrences of each link text
    for (const link of links) {
        let startIndex = 0
        while (true) {
            const index = description.indexOf(link.sectionText, startIndex)
            if (index === -1) break

            linkPositions.push({
                start: index,
                end: index + link.sectionText.length,
                text: link.sectionText,
                url: link.sectionUrl,
            })

            startIndex = index + 1
        }
    }

    // Sort by position in text for optimal processing
    linkPositions.sort((a, b) => a.start - b.start)

    // Build segments array
    const segments: Array<{ type: 'text' | 'link'; content: string; url?: string }> = []
    let currentIndex = 0

    for (const linkPos of linkPositions) {
        // Add text before link (if any)
        if (currentIndex < linkPos.start) {
            segments.push({
                type: 'text',
                content: description.slice(currentIndex, linkPos.start),
            })
        }

        // Add link segment
        segments.push({
            type: 'link',
            content: linkPos.text,
            url: linkPos.url,
        })

        currentIndex = linkPos.end
    }

    // Add remaining text after last link (if any)
    if (currentIndex < description.length) {
        segments.push({
            type: 'text',
            content: description.slice(currentIndex),
        })
    }

    return segments
}

// RichText component to render text with clickable links
function RichText({
    description,
    links,
    tintColor,
    style,
}: {
    description: string
    links?: { sectionText: string; sectionUrl: string }[]
    tintColor: string
    style: TextStyle
}) {
    const segments = useMemo(() => parseTextWithLinks(description, links), [description, links])

    const handleLinkPress = useCallback(async (url: string) => {
        try {
            await Linking.openURL(url)
        } catch {
            alert('Could not open link')
        }
    }, [])

    return (
        <Text style={style}>
            {segments.map((segment, index) => {
                if (segment.type === 'link') {
                    return (
                        <Text
                            key={index}
                            style={{
                                ...style,
                                color: tintColor,
                                fontWeight: 700,
                            }}
                            onPress={() => handleLinkPress(segment.url!)}
                        >
                            {segment.content}
                        </Text>
                    )
                }
                return <Text key={index}>{segment.content}</Text>
            })}
        </Text>
    )
}

export default function Onboarding({
    appName,
    icon,
    features,
    titleStyle,
    featureTitleStyle,
    featureDescriptionStyle,
    tintColor,
    ButtonComponent,
}: {
    features: OnboardingFeature[]
    icon: ImageSourcePropType
    appName: string
    tintColor: string
    titleStyle: {
        fontFamily?: TextStyle['fontFamily']
        fontSize?: TextStyle['fontSize']
        fontWeight?: TextStyle['fontWeight']
        lineHeight?: TextStyle['lineHeight']
        color?: TextStyle['color']
    }
    featureTitleStyle: {
        fontFamily?: TextStyle['fontFamily']
        fontSize?: TextStyle['fontSize']
        fontWeight?: TextStyle['fontWeight']
        lineHeight?: TextStyle['lineHeight']
        color?: TextStyle['color']
    }
    featureDescriptionStyle: {
        fontFamily?: TextStyle['fontFamily']
        fontSize?: TextStyle['fontSize']
        fontWeight?: TextStyle['fontWeight']
        lineHeight?: TextStyle['lineHeight']
        color?: TextStyle['color']
    }
    ButtonComponent: ComponentType
}) {
    const { bottom: bottomInset } = useSafeAreaInsets()
    const { height: screenHeight } = useWindowDimensions()

    // Shared values for animations
    const iconTitleOpacity = useSharedValue(0)
    const iconTitleScale = useSharedValue(ANIMATION_CONFIG.INITIAL_SCALE)
    const iconTitleTranslateY = useSharedValue(screenHeight * ANIMATION_CONFIG.SCREEN_HEIGHT_FACTOR)
    const blurViewOpacity = useSharedValue(0)

    // State to trigger feature animations
    const [shouldAnimateFeatures, setShouldAnimateFeatures] = useState(false)

    // Start animation sequence on mount
    useEffect(() => {
        // Step 1: Icon and title fade in + zoom in
        iconTitleOpacity.value = withTiming(1, {
            duration: ANIMATION_CONFIG.FADE_IN_DURATION,
            easing: Easing.out(Easing.quad),
        })

        iconTitleScale.value = withTiming(1, {
            duration: ANIMATION_CONFIG.FADE_IN_DURATION,
            easing: Easing.out(Easing.back(ANIMATION_CONFIG.BACK_EASING_FACTOR)),
        })

        // Step 2: Move them up after fade+zoom completes
        iconTitleTranslateY.value = withDelay(
            ANIMATION_CONFIG.FADE_IN_DURATION,
            withTiming(0, {
                duration: ANIMATION_CONFIG.MOVE_UP_DURATION,
                easing: Easing.out(Easing.cubic),
            })
        )

        // Step 3: Trigger features to animate after move completes
        const featureAnimationTriggerDelay =
            ANIMATION_CONFIG.FADE_IN_DURATION +
            ANIMATION_CONFIG.MOVE_UP_DURATION +
            ANIMATION_CONFIG.BUFFER_DELAY

        setTimeout(() => {
            setShouldAnimateFeatures(true)
        }, featureAnimationTriggerDelay)

        // Step 4: Blur view animates after all features complete
        blurViewOpacity.value = withDelay(
            featureAnimationTriggerDelay +
                features.length * ANIMATION_CONFIG.STAGGER_DELAY +
                ANIMATION_CONFIG.BUFFER_DELAY,
            withTiming(1, {
                duration: ANIMATION_CONFIG.FEATURE_DURATION,
                easing: Easing.out(Easing.quad),
            })
        )
    }, [iconTitleOpacity, iconTitleScale, iconTitleTranslateY, blurViewOpacity, features.length])

    // Animated styles
    const iconTitleAnimatedStyle = useAnimatedStyle(() => ({
        opacity: iconTitleOpacity.value,
        transform: [{ translateY: iconTitleTranslateY.value }, { scale: iconTitleScale.value }],
    }))

    const blurViewAnimatedStyle = useAnimatedStyle(() => ({
        opacity: blurViewOpacity.value,
    }))

    const memoizedTitleStyle = useMemo(
        () =>
            ({
                color: 'white',
                textAlign: 'center',
                fontSize: 36,
                fontWeight: 800,
                ...titleStyle,
            }) as const,
        [titleStyle]
    )

    return (
        <View
            style={{
                flex: 1,
                flexDirection: 'column',
            }}
        >
            <ScrollView
                style={{
                    flex: 1,
                    paddingHorizontal: 42,
                }}
                contentContainerStyle={{
                    flexDirection: 'column',
                    gap: 64,
                }}
            >
                <Animated.View
                    style={[
                        {
                            flexDirection: 'column',
                            gap: 28,
                        },
                        iconTitleAnimatedStyle,
                    ]}
                >
                    <SquircleView
                        style={{
                            width: 100,
                            height: 100,
                            alignSelf: 'center',
                            overflow: 'hidden',
                            borderRadius: 16.5,
                        }}
                        preserveSmoothing={true}
                        cornerSmoothing={100}
                    >
                        <Image source={icon} style={{ width: 100, height: 100 }} />
                    </SquircleView>

                    <Text style={memoizedTitleStyle}>
                        Welcome to <Text style={{ color: tintColor }}>{appName}</Text>
                    </Text>
                </Animated.View>

                <View
                    style={{
                        flexDirection: 'column',
                        gap: 42,
                    }}
                >
                    {features.map((feature, index) => (
                        <Feature
                            key={index}
                            title={feature.title}
                            description={feature.description}
                            systemImage={feature.systemImage}
                            IconComponent={feature.icon}
                            tintColor={tintColor}
                            titleStyle={featureTitleStyle}
                            descriptionStyle={featureDescriptionStyle}
                            links={feature.links}
                            animationDelay={index * ANIMATION_CONFIG.STAGGER_DELAY}
                            shouldAnimate={shouldAnimateFeatures}
                        />
                    ))}
                </View>
            </ScrollView>

            {ButtonComponent && (
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                        },
                        blurViewAnimatedStyle,
                    ]}
                >
                    <BlurView
                        style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#00000090',
                            backdropFilter: 'blur(10px)',
                            paddingBottom: 24 + bottomInset,
                            paddingTop: 24,
                        }}
                        intensity={24}
                    >
                        <ButtonComponent />
                    </BlurView>
                </Animated.View>
            )}
        </View>
    )
}

function Feature({
    title,
    description,
    systemImage,
    IconComponent,
    tintColor,
    titleStyle,
    descriptionStyle,
    links,
    animationDelay = 0,
    shouldAnimate = false,
}: {
    title: string
    description: string
    systemImage: SymbolViewProps['name']
    IconComponent?: ComponentType
    tintColor: string
    titleStyle: {
        fontFamily?: TextStyle['fontFamily']
        fontSize?: TextStyle['fontSize']
        fontWeight?: TextStyle['fontWeight']
        lineHeight?: TextStyle['lineHeight']
        color?: TextStyle['color']
    }
    descriptionStyle: {
        fontFamily?: TextStyle['fontFamily']
        fontSize?: TextStyle['fontSize']
        fontWeight?: TextStyle['fontWeight']
        lineHeight?: TextStyle['lineHeight']
        color?: TextStyle['color']
    }
    links?: { sectionText: string; sectionUrl: string }[]
    animationDelay?: number
    shouldAnimate?: boolean
}) {
    const opacity = useSharedValue(0)
    const translateY = useSharedValue(ANIMATION_CONFIG.FEATURE_TRANSLATE_OFFSET)

    // Trigger animation when shouldAnimate changes
    useEffect(() => {
        if (shouldAnimate) {
            opacity.value = withDelay(
                animationDelay,
                withTiming(1, {
                    duration: ANIMATION_CONFIG.FEATURE_DURATION,
                    easing: Easing.out(Easing.quad),
                })
            )

            translateY.value = withDelay(
                animationDelay,
                withTiming(0, {
                    duration: ANIMATION_CONFIG.FEATURE_DURATION,
                    easing: Easing.out(Easing.quad),
                })
            )
        }
    }, [shouldAnimate, animationDelay, opacity, translateY])

    const isAndroid = useMemo(() => Platform.OS === 'android', [])

    const memoizedTitleStyle = useMemo(
        () =>
            ({
                color: 'white',
                fontSize: 18,
                fontWeight: 600,
                ...titleStyle,
            }) as const,
        [titleStyle]
    )

    const memoizedDescriptionStyle = useMemo(
        () =>
            ({
                color: 'gray',
                fontSize: 18,
                fontWeight: 400,
                lineHeight: 24,
                ...descriptionStyle,
            }) as const,
        [descriptionStyle]
    )

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
        width: '100%',
        maxWidth: 550,
        alignSelf: 'center',
    }))

    return (
        <Animated.View style={animatedStyle}>
            <View
                style={{
                    // backgroundColor: 'red',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 12,
                }}
            >
                {isAndroid ? (
                    IconComponent ? (
                        <IconComponent />
                    ) : (
                        <View
                            style={{
                                width: 42,
                                height: 42,
                                backgroundColor: tintColor,
                                borderRadius: 21,
                            }}
                        />
                    )
                ) : (
                    <SymbolView name={systemImage} size={42} tintColor={tintColor} />
                )}

                <View style={{ flexDirection: 'column', gap: 2, flex: 1 }}>
                    <Text style={memoizedTitleStyle}>{title}</Text>
                    <RichText
                        description={description}
                        links={links}
                        tintColor={tintColor}
                        style={memoizedDescriptionStyle}
                    />
                </View>
            </View>
        </Animated.View>
    )
}
