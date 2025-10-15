import { startTerminalSession } from '@/api/mutations'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import { usePersistedStore } from '@/stores/persisted'
import { COLORS, SHADOWS } from '@/theme'
import { useMutation } from '@tanstack/react-query'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import WebSocketWithSelfSignedCert from 'react-native-websocket-self-signed'

export default function ContainerTerminalScreen() {
    const currentConnection = usePersistedStore((state) => state.currentConnection)

    const { id } = useLocalSearchParams<{ id: string }>()
    const [command, setCommand] = useState('')
    const [selectedShell, setSelectedShell] = useState<'bash' | 'sh'>('bash')
    const [user, setUser] = useState('')
    const [isConfigured, setIsConfigured] = useState(false)
    const [output, setOutput] = useState<string[]>([])
    const wsRef = useRef<any | null>(null)
    const scrollViewRef = useRef<ScrollView>(null)
    const [isConnected, setIsConnected] = useState(false)

    const startSessionMutation = useMutation({
        mutationFn: async () => {
            const result = await startTerminalSession(id, selectedShell, user)
            return result
        },
        onSuccess: (data) => {
            setIsConfigured(true)
            connectWebSocket(data.Id)
        },
    })

    const connectWebSocket = (sessionId: string) => {
        if (wsRef.current) {
            wsRef.current.close()
        }

        const ws = new WebSocketWithSelfSignedCert()

        ws.onOpen(() => {
            console.log('WebSocket connection opened')
            setIsConnected(true)
            setOutput((prev) => [...prev, '🟢 Connected to terminal'])
        })

        ws.onMessage((message: string) => {
            if (message === '# ') return

            let parsedMessage = message.trim()

            if (parsedMessage.endsWith('#')) {
                parsedMessage = parsedMessage.slice(0, -1)
            }

            if (parsedMessage.endsWith('\n')) {
                parsedMessage = parsedMessage.slice(0, -1)
            }

            if (parsedMessage.endsWith('\r')) {
                parsedMessage = parsedMessage.slice(0, -1)
            }

            if (parsedMessage.endsWith('\n#')) {
                parsedMessage = parsedMessage.slice(0, -2)
            }

            setOutput((prev) => [...prev, parsedMessage])
        })

        ws.onClose(() => {
            setIsConnected(false)
            setOutput((prev) => [...prev, '🔴 Connection closed'])
        })

        ws.onError((err: string) => {
            console.error('WebSocket error:', err)
            setOutput((prev) => [...prev, `🔴 Error: ${err}`])
        })

        const fullUrl = `wss://${currentConnection!.baseUrl.replace('https://', '').replace('http://', '')}/api/websocket/exec?endpointId=${currentConnection!.currentEndpointId}&id=${sessionId}`

        ws.connect(fullUrl, {
            'x-api-key': currentConnection!.apiToken,
        })
            .then((data) => {
                console.log('Connected to WebSocketWithSelfSignedCert', data)
            })
            .catch((err) => {
                console.error('Failed to connect: ' + err)
                setOutput((prev) => [...prev, `🔴 Connection error: ${err}`])
            })

        wsRef.current = ws
    }

    const sendCommand = () => {
        if (!wsRef.current || !isConnected) {
            setOutput((prev) => [...prev, '🔴 Error: Not connected to terminal'])
            return
        }

        wsRef.current.send(command + '\n')

        setCommand('')
    }

    // Handle cleanup when navigating away
    useFocusEffect(
        useCallback(() => {
            return () => {
                console.log('Cleaning up terminal session...')
                if (wsRef.current) {
                    wsRef.current.close()
                    wsRef.current = null
                    console.log('Terminal session closed')
                }
                setIsConfigured(false)
                setOutput([])
            }
        }, [])
    )

    // Auto-scroll to bottom when output changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true })
        }
    }, [output])

    if (isConfigured) {
        return (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
            >
                <View style={{ flex: 1 }}>
                    {/* Terminal Output Area */}
                    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
                        <ScrollView
                            ref={scrollViewRef}
                            style={{ padding: 12 }}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        >
                            {output.map((line, index) => (
                                <Text key={index} style={styles.outputText}>
                                    {line}
                                </Text>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Command Input Area - Update styles */}
                    <View style={[styles.inputArea, { paddingBottom: 32 }]}>
                        <Text style={styles.prompt}>$</Text>
                        <TextInput
                            style={styles.commandInput}
                            value={command}
                            onChangeText={setCommand}
                            placeholder="Enter command..."
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            spellCheck={false}
                            multiline={false}
                            onSubmitEditing={sendCommand}
                            blurOnSubmit={false}
                            returnKeyType="send"
                            returnKeyLabel="Send"
                            enablesReturnKeyAutomatically={true}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        )
    }

    return (
        <View style={[styles.setupContainer, { backgroundColor: COLORS.bgApp }]}>
            <View style={[styles.setupCard]}>
                <Text style={[styles.setupTitle, { color: COLORS.primary }]}>
                    Terminal Settings
                </Text>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: COLORS.textMuted }]}>Command</Text>
                    <View style={styles.commandButtons}>
                        <TouchableOpacity
                            style={[
                                styles.commandButton,
                                {
                                    borderColor:
                                        selectedShell === 'bash' ? COLORS.primary : COLORS.hrMuted,
                                    backgroundColor:
                                        selectedShell === 'bash'
                                            ? COLORS.primaryDark
                                            : COLORS.bgApp,
                                },
                            ]}
                            onPress={() => setSelectedShell('bash')}
                        >
                            <Text
                                style={[
                                    styles.commandButtonText,
                                    {
                                        color:
                                            selectedShell === 'bash'
                                                ? COLORS.text
                                                : COLORS.textMuted,
                                    },
                                ]}
                            >
                                /bin/bash
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.commandButton,
                                {
                                    borderColor:
                                        selectedShell === 'sh' ? COLORS.primary : COLORS.hrMuted,
                                    backgroundColor:
                                        selectedShell === 'sh' ? COLORS.primaryDark : COLORS.bgApp,
                                },
                            ]}
                            onPress={() => setSelectedShell('sh')}
                        >
                            <Text
                                style={[
                                    styles.commandButtonText,
                                    {
                                        color:
                                            selectedShell === 'sh' ? COLORS.text : COLORS.textMuted,
                                    },
                                ]}
                            >
                                /bin/sh
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: COLORS.textMuted }]}>User</Text>
                    <TextInput
                        style={[
                            styles.userInput,
                            {
                                borderColor: COLORS.hrMuted,
                                backgroundColor: COLORS.bgApp,
                                color: COLORS.text,
                            },
                        ]}
                        value={user}
                        onChangeText={setUser}
                        placeholder="Enter username"
                        placeholderTextColor={COLORS.textMuted}
                    />
                </View>

                <TouchableOpacity
                    style={styles.connectButton}
                    onPress={() => startSessionMutation.mutate()}
                    disabled={startSessionMutation.isPending}
                >
                    {startSessionMutation.isPending ? (
                        <ActivityIndicator size="small" />
                    ) : (
                        <Text style={[styles.connectButtonText, { color: COLORS.text }]}>
                            Connect
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    setupContainer: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    setupCard: StyleSheet.flatten([
        {
            backgroundColor: COLORS.bgSecondary,
            borderRadius: 16,
            padding: 16,
        },
        SHADOWS.small,
    ]),
    setupTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 24,
        textAlign: 'center',
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 15,
        marginBottom: 8,
    },
    commandButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    commandButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    commandButtonText: {
        fontSize: 15,
    },
    userInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
    },
    connectButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: COLORS.primary,
    },
    connectButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    outputText: {
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 20,
        marginBottom: 2,
    },
    inputArea: {
        backgroundColor: '#2a2a2a',
        padding: 12,
        paddingBottom: 32,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#3a3a3a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    prompt: {
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: 16,
        marginRight: 8,
    },
    commandInput: {
        flex: 1,
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: 16,
        padding: 8,
        backgroundColor: '#1a1a1a',
        borderRadius: 6,
    },
})
