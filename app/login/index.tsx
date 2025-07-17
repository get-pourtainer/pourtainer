import { guestClient } from '@/lib/guest-client'
import { usePersistedStore } from '@/stores/persisted'
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import type { Endpoint } from '@/types/endpoint'
import WidgetKitModule from '@/widgetkit'
import { router } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
    Alert,
    Button,
    Image,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import Animated, {
    interpolate,
    useAnimatedKeyboard,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
const sanitizeUrl = (url: string) => {
    return url.replace(/\/+$/, '')
}

export default function LoginScreen() {
    const addConnection = usePersistedStore((state) => state.addConnection)
    const switchConnection = usePersistedStore((state) => state.switchConnection)

    const { bottom: bottomInset, top: topInset } = useSafeAreaInsets()

    const [isLoading, setIsLoading] = useState(false)
    const baseUrlRef = useRef<string>('')
    const apiTokenRef = useRef<string>('')
    const keyboard = useAnimatedKeyboard({
        isStatusBarTranslucentAndroid: true,
        isNavigationBarTranslucentAndroid: true,
    })

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

    const handleLogin = useCallback(async () => {
        const baseUrl = baseUrlRef.current.trim() || ''
        const apiToken = apiTokenRef.current.trim() || ''

        if (!baseUrl || !apiToken) {
            Alert.alert('Error', 'Please fill in all fields')
            return
        }

        setIsLoading(true)

        const sanitizedUrl = sanitizeUrl(baseUrl)
        const instanceId = await validateConnection(sanitizedUrl, apiToken)

        if (instanceId) {
            const endpointsResponse = await guestClient(
                sanitizedUrl,
                '/api/endpoints?excludeSnapshots=true',
                apiToken
            )

            if (endpointsResponse.respInfo.status >= 300) {
                Alert.alert('Error', 'Could not fetch endpoints. Please check your server.')
                return
            }

            const endpoints = endpointsResponse.json() as Endpoint[]
            console.log(endpoints)

            const firstId = endpoints.at(0)?.Id
            if (!firstId) {
                Alert.alert('Error', 'Your server does not have any endpoints.')
                return
            }

            addConnection({
                id: instanceId,
                apiToken,
                baseUrl: sanitizedUrl,
                currentEndpointId: firstId.toString(),
            })
            switchConnection(instanceId)

            WidgetKitModule.registerConnection({
                id: instanceId,
                url: sanitizedUrl,
                accessToken: apiToken,
            })

            router.replace('/')
        }

        setIsLoading(false)
    }, [addConnection, switchConnection, validateConnection])

    const openApiDocs = () => {
        Linking.openURL('https://docs.portainer.io/api/access')
    }

    return (
        <>
            <KeyboardAwareScrollView
                bottomOffset={20}
                keyboardShouldPersistTaps="handled"
                style={{
                    flex: 1,
                    backgroundColor: COLORS.bgApp,
                    paddingTop: topInset,
                }}
            >
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
                            onChangeText={(text) => {
                                apiTokenRef.current = text
                            }}
                            returnKeyLabel="Connect"
                            returnKeyType="go"
                            onSubmitEditing={handleLogin}
                        />
                        <View style={styles.buttonContainer}>
                            <Button
                                title={isLoading ? 'Connecting...' : 'Connect'}
                                onPress={handleLogin}
                                color={isLoading ? COLORS.primaryLight : COLORS.primary}
                                disabled={isLoading}
                            />
                        </View>
                    </View>
                </View>
            </KeyboardAwareScrollView>
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
        </>
    )
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
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
