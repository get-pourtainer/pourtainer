import { guestClient } from '@/lib/guest-client'
import { useAuthStore } from '@/stores/auth'
import type { Endpoint } from '@/types/endpoint'
import { router } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import Animated, { KeyboardState, useAnimatedKeyboard, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { StyleSheet } from 'react-native-unistyles'
import {
    Alert,
    Button,
    Image,
    Linking,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native'

const sanitizeUrl = (url: string) => {
    return url.replace(/\/+$/, '')
}

export default function LoginScreen() {
    const { setCurrentEndpointId, addInstance } = useAuthStore()
    const [isLoading, setIsLoading] = useState(false)

    const baseUrlRef = useRef<string>('')
    const apiTokenRef = useRef<string>('')
    const keyboard = useAnimatedKeyboard()
    const helpBoxAnimatedStyles = useAnimatedStyle(() => {
        const isKeyboardVisible = [KeyboardState.OPEN, KeyboardState.OPENING]
            .some(state => keyboard.state.value === state)

        return {
            opacity: withTiming(isKeyboardVisible ? 0 : 1),
            transform: [{ translateY: withTiming(isKeyboardVisible ? 200 : 0) }]
        }
    })


    const validateInstance = useCallback(async (sanitizedUrl: string, apiToken: string) => {
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
            return false
        } catch {
            Alert.alert(
                'Error',
                'Could not connect to server. Please check your server address and API token.'
            )
            return false
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
        const instanceId = await validateInstance(sanitizedUrl, apiToken)

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

            setCurrentEndpointId(firstId.toString())
            addInstance({ id: instanceId, apiToken, baseUrl: sanitizedUrl })

            router.replace('/')
        }

        setIsLoading(false)
    }, [addInstance, setCurrentEndpointId, validateInstance])

    const openApiDocs = () => {
        Linking.openURL('https://docs.portainer.io/api/access')
    }

    return (
        <KeyboardAvoidingView
            behavior="height"
            style={styles.container}
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
                        placeholderTextColor={styles.placeholder.color}
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
                        placeholderTextColor={styles.placeholder.color}
                        secureTextEntry={true}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={(text) => {
                            apiTokenRef.current = text
                        }}
                    />
                    <View style={styles.buttonContainer}>
                        <Button
                            title={isLoading ? 'Connecting...' : 'Connect'}
                            onPress={handleLogin}
                            color={styles.button.color}
                            disabled={isLoading}
                        />
                    </View>
                </View>
            </View>
            <Animated.View style={[helpBoxAnimatedStyles]}>
                <Pressable style={styles.helpBox} onPress={openApiDocs}>
                    <Text style={styles.helpTitle}>Need help finding your API key?</Text>
                    <Text style={styles.helpText}>
                        Tap to learn how to generate a Portainer API key.
                    </Text>
                </Pressable>
            </Animated.View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.app,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: theme.spacing.lg,
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    logo: {
        width: 250,
        height: 250,
        alignSelf: 'center',
        marginBottom: theme.spacing.sm,
        marginLeft: 40,
    },
    title: StyleSheet.flatten([
        theme.typography.title,
        {
            textAlign: 'center',
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xs,
        },
    ]),
    subtitle: StyleSheet.flatten([
        theme.typography.body,
        {
            textAlign: 'center',
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.lg,
        },
    ]),
    inputContainer: {
        marginTop: theme.spacing.lg,
        width: '100%',
    },
    label: StyleSheet.flatten([
        theme.typography.small,
        {
            color: theme.colors.form.label,
            marginBottom: theme.spacing.xs,
            fontWeight: '500',
        },
    ]),
    input: StyleSheet.flatten([
        {
            height: 48,
            borderColor: theme.colors.form.input.border,
            borderWidth: 1,
            marginBottom: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.form.input.background,
            color: theme.colors.form.input.text,
            fontSize: 16,
        },
        theme.shadows.small,
    ]),
    buttonContainer: {
        marginTop: theme.spacing.md,
    },
    placeholder: {
        color: theme.colors.form.input.placeholder,
    },
    button: {
        color: theme.colors.primary,
    },
    helpBox: StyleSheet.flatten([
        theme.shadows.small,
        {
            backgroundColor: theme.colors.searchBar.background,
            padding: theme.spacing.lg,
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            borderWidth: 1,
            borderColor: theme.colors.form.input.border,
        },
    ]),
    helpTitle: StyleSheet.flatten([
        theme.typography.subtitle,
        {
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xs,
        },
    ]),
    helpText: StyleSheet.flatten([
        theme.typography.small,
        {
            color: theme.colors.text.secondary,
        },
    ]),
}))
