import guestClient from '@/lib/guest'
import { usePersistedStore } from '@/stores/persisted'
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import type { Endpoint } from '@/types/endpoint'
import { Ionicons } from '@expo/vector-icons'
import { useMutation } from '@tanstack/react-query'
import { router, useNavigation } from 'expo-router'
import { usePlacement } from 'expo-superwall'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
    Alert,
    Button,
    Image,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { KeyboardAwareScrollView, useAnimatedKeyboard } from 'react-native-keyboard-controller'
import Animated, { interpolate, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

// remove trailing slashes from url
const sanitizeUrl = (url: string) => {
    return url.replace(/\/+$/, '')
}

export default function LoginScreen() {
    const navigation = useNavigation()
    const { registerPlacement } = usePlacement()

    const addConnection = usePersistedStore((state) => state.addConnection)
    const switchConnection = usePersistedStore((state) => state.switchConnection)
    const connections = usePersistedStore((state) => state.connections)

    const { bottom: bottomInset } = useSafeAreaInsets()

    const [isModal, setIsModal] = useState(false)

    const baseUrlRef = useRef<string>('')
    const apiTokenRef = useRef<string>('')
    const keyboard = useAnimatedKeyboard()

    const showCloseButton = useMemo(() => {
        return Platform.OS === 'android' && isModal
    }, [isModal])

    const helpBoxAnimatedStyles = useAnimatedStyle(() => {
        const isKeyboardVisible = interpolate(keyboard.height.value, [0, 1], [0, 1], 'clamp')

        return {
            opacity: withTiming(isKeyboardVisible ? 0 : 1),
            bottom: withTiming(isKeyboardVisible ? -300 : 0),
        }
    })

    const validateConnection = useCallback(async (sanitizedUrl: string, apiToken: string) => {
        try {
            // Try to authenticate with the API token and check system status
            const userResponse = await guestClient(sanitizedUrl, '/api/users/me', apiToken)

            const statusResponse = await guestClient(sanitizedUrl, '/api/system/status', apiToken)

            if (
                userResponse.respInfo.status >= 200 &&
                userResponse.respInfo.status < 300 &&
                statusResponse.respInfo.status >= 200 &&
                statusResponse.respInfo.status < 300
            ) {
                const { InstanceID } = statusResponse.json()
                console.log('InstanceID', InstanceID)
                return InstanceID
            }
            Alert.alert(
                'Error',
                'Could not connect to server. Please check your server address and API token.'
            )
        } catch {
            Alert.alert(
                'Error',
                'Could not connect to server. Please check your server address and API token.'
            )
        }
    }, [])

    const loginMutation = useMutation({
        mutationFn: async () => {
            const baseUrl = baseUrlRef.current.trim() || ''
            const apiToken = apiTokenRef.current.trim() || ''

            if (!baseUrl || !apiToken) {
                throw new Error('Please fill in all fields')
            }

            const sanitizedUrl = sanitizeUrl(baseUrl)
            const instanceId = await validateConnection(sanitizedUrl, apiToken)

            if (!instanceId) {
                throw new Error('Invalid token')
            }

            if (connections.find((c) => c.id === instanceId)) {
                throw new Error('You are already connected to this instance')
            }

            const endpointsResponse = await guestClient(
                sanitizedUrl,
                '/api/endpoints?excludeSnapshots=true',
                apiToken
            )

            if (endpointsResponse.respInfo.status >= 300) {
                throw new Error('Could not fetch endpoints. Please check your server.')
            }

            const endpoints = endpointsResponse.json() as Endpoint[]
            console.log(endpoints)

            const firstId = endpoints.at(0)?.Id
            if (!firstId) {
                throw new Error('Your server does not have any endpoints.')
            }

            return { instanceId, apiToken, sanitizedUrl, firstId }
        },
        onSuccess: ({ instanceId, apiToken, sanitizedUrl, firstId }) => {
            addConnection({
                id: instanceId,
                apiToken,
                baseUrl: sanitizedUrl,
                currentEndpointId: null,
            })
            switchConnection({ connectionId: instanceId, endpointId: firstId.toString() })

            if (connections.length === 1) {
                registerPlacement({
                    placement: 'SuccessfulLogin',
                }).catch()
            }

            router.replace('/')
        },
        onError: (error) => {
            Alert.alert('Error', error.message)
        },
    })

    const buttonTextColor = useMemo(() => {
        if (Platform.OS === 'android') {
            return loginMutation.isPending ? COLORS.text : COLORS.primary
        }
        return loginMutation.isPending ? COLORS.primaryLight : COLORS.primary
    }, [loginMutation.isPending])

    const openApiDocs = () => {
        Linking.openURL('https://docs.portainer.io/api/access')
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        setIsModal(connections.length > 0)
    }, [])

    useLayoutEffect(() => {
        navigation.setOptions({
            gestureEnabled: isModal,
        })
    }, [navigation, isModal])

    return (
        <>
            <SafeAreaView style={{ flex: 1 }} edges={Platform.OS === 'android' ? ['top'] : []}>
                <KeyboardAwareScrollView
                    bottomOffset={20}
                    extraKeyboardSpace={70}
                    keyboardShouldPersistTaps="handled"
                    style={{
                        flex: 1,
                        backgroundColor: COLORS.bgApp,
                    }}
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingTop: 120,
                        paddingBottom: 280,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {showCloseButton && (
                        <TouchableOpacity
                            style={{
                                position: 'absolute',
                                top: -42,
                                right: 30,
                                backgroundColor: '#ffffff28',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: 16,
                                height: 32,
                                width: 32,
                            }}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="close" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                    )}
                    <View style={styles.content}>
                        <Image
                            source={require('../../assets/whale.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Pourtainer</Text>
                        <Text style={styles.subtitle}>Connect to your instance</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Server Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://192.168.1.100:9443"
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                                keyboardAppearance="dark"
                                onChangeText={(text) => {
                                    baseUrlRef.current = text
                                }}
                            />
                            <Text style={styles.label}>API Token</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your API token"
                                placeholderTextColor={COLORS.textMuted}
                                secureTextEntry={true}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                                keyboardAppearance="dark"
                                onChangeText={(text) => {
                                    apiTokenRef.current = text
                                }}
                                returnKeyLabel="Connect"
                                returnKeyType="go"
                                onSubmitEditing={() => loginMutation.mutate()}
                            />
                            <View style={styles.buttonContainer}>
                                <Button
                                    title={loginMutation.isPending ? 'Connecting...' : 'Connect'}
                                    onPress={() => loginMutation.mutate()}
                                    color={buttonTextColor}
                                    disabled={loginMutation.isPending}
                                />
                            </View>
                        </View>
                    </View>
                </KeyboardAwareScrollView>
            </SafeAreaView>
            {!isModal && (
                <Animated.View style={[helpBoxAnimatedStyles]}>
                    <Pressable
                        style={[
                            styles.helpBox,
                            {
                                marginBottom: Math.max(bottomInset, 25),
                            },
                        ]}
                        onPress={openApiDocs}
                    >
                        <Text style={styles.helpTitle}>Need help finding your API key?</Text>
                        <Text style={styles.helpText}>
                            Tap to learn how to generate a Portainer API key.
                        </Text>
                    </Pressable>
                </Animated.View>
            )}
        </>
    )
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    logo: {
        width: 250,
        height: 250,
        alignSelf: 'center',
        marginBottom: SPACING.sm,
        marginLeft: 40,
    },
    title: StyleSheet.flatten([
        TYPOGRAPHY.title,
        {
            textAlign: 'center',
            color: COLORS.primary,
            marginBottom: SPACING.xs,
        },
    ]),
    subtitle: StyleSheet.flatten([
        TYPOGRAPHY.body,
        {
            textAlign: 'center',
            color: COLORS.textMuted,
            marginBottom: SPACING.lg,
        },
    ]),
    inputContainer: {
        marginTop: SPACING.lg,
        width: '100%',
    },
    label: StyleSheet.flatten([
        TYPOGRAPHY.small,
        {
            color: COLORS.text,
            marginBottom: SPACING.xs,
            fontWeight: '500',
        },
    ]),
    input: StyleSheet.flatten([
        {
            height: 48,
            borderColor: COLORS.hrMuted,
            borderWidth: 1,
            marginBottom: SPACING.md,
            paddingHorizontal: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            backgroundColor: COLORS.bgSecondary,
            color: COLORS.text,
            fontSize: 16,

            marginTop: SPACING.xs,
        },
        SHADOWS.small,
    ]),
    buttonContainer: {
        marginTop: SPACING.md,
    },
    helpBox: StyleSheet.flatten([
        SHADOWS.small,
        {
            backgroundColor: COLORS.bgSecondary,
            padding: SPACING.lg,
            marginHorizontal: SPACING.lg,
            borderRadius: BORDER_RADIUS.lg,
            borderWidth: 1,
            borderColor: COLORS.hrPrimary,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
        },
    ]),
    helpTitle: StyleSheet.flatten([
        TYPOGRAPHY.subtitle,
        {
            color: COLORS.primary,
            marginBottom: SPACING.xs,
        },
    ]),
    helpText: StyleSheet.flatten([
        TYPOGRAPHY.small,
        {
            color: COLORS.textMuted,
        },
    ]),
})
