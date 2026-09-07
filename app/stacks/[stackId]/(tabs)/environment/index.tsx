import { updateStackEnv } from '@/api/mutations'
import { fetchStack } from '@/api/queries'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import { useFlashlistProps } from '@/lib/hooks'
import { COLORS } from '@/theme'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { FlashList } from '@shopify/flash-list'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { NotificationFeedbackType } from 'expo-haptics'
import { useGlobalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { Pressable, Text, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

type EnvVar = { name: string; value: string }

function toEnvVars(pairs: Array<{ name?: string; value?: string }> | undefined): EnvVar[] {
    return (pairs ?? []).map((pair) => ({ name: pair.name ?? '', value: pair.value ?? '' }))
}

// Single-field prompt with a Cancel button
function promptText(
    title: string,
    message: string,
    confirm: string,
    defaultValue: string,
    onConfirm: (text: string) => void
) {
    Alert.prompt(
        title,
        message,
        [
            { text: 'Cancel', style: 'cancel' },
            { text: confirm, onPress: (text?: string) => onConfirm(text ?? '') },
        ],
        'plain-text',
        defaultValue
    )
}

function parseAssignment(text: string | undefined): EnvVar | null {
    const trimmed = (text ?? '').trim()
    const separator = trimmed.indexOf('=')
    const name = (separator === -1 ? trimmed : trimmed.slice(0, separator)).trim()
    if (!name) return null
    return { name, value: separator === -1 ? '' : trimmed.slice(separator + 1) }
}

export default function StackEnvironmentScreen() {
    const { stackId } = useGlobalSearchParams<{ stackId: string }>()
    const navigation = useNavigation()
    const queryClient = useQueryClient()

    const stackQuery = useQuery({
        queryKey: ['stack', stackId],
        queryFn: async () => fetchStack(Number(stackId)),
        enabled: !!stackId,
    })

    // Unsaved edits, or null while the list mirrors the server
    const serverEnv = useMemo(() => toEnvVars(stackQuery.data?.Env), [stackQuery.data])
    const [draft, setDraft] = useState<EnvVar[] | null>(null)
    const env = draft ?? serverEnv
    const hasChanges = draft !== null

    const updateMutation = useMutation({
        mutationFn: async (nextEnv: EnvVar[]) => updateStackEnv(Number(stackId), nextEnv),
        onSuccess: () => {
            Haptics.notificationAsync(NotificationFeedbackType.Success)
            setDraft(null)
            queryClient.invalidateQueries({ queryKey: ['stack', stackId] })
            queryClient.invalidateQueries({ queryKey: ['containers'] })
            Alert.alert('Success', 'Stack redeployed with the new environment')
        },
        onError: (error) => {
            Haptics.notificationAsync(NotificationFeedbackType.Error)
            Sentry.captureException(error)
            Alert.alert('Error updating environment', error.message)
        },
    })

    const addVariable = useCallback(() => {
        promptText('Add variable', 'NAME=value', 'Add', '', (text) => {
            const parsed = parseAssignment(text)
            if (!parsed) return
            if (env.some((item) => item.name === parsed.name)) {
                Alert.alert('Already defined', `${parsed.name} already exists.`)
                return
            }
            setDraft([...env, parsed])
        })
    }, [env])

    const editValue = useCallback(
        (index: number) => {
            const current = env[index]
            promptText(current.name, 'Value', 'Save', current.value, (text) => {
                setDraft(env.map((item, i) => (i === index ? { ...item, value: text } : item)))
            })
        },
        [env]
    )

    const renameVariable = useCallback(
        (index: number) => {
            const current = env[index]
            promptText('Rename variable', 'Name', 'Rename', current.name, (text) => {
                const name = text.trim()
                if (!name || name.includes('=')) return
                if (env.some((item, i) => i !== index && item.name === name)) {
                    Alert.alert('Already defined', `${name} already exists.`)
                    return
                }
                setDraft(env.map((item, i) => (i === index ? { ...item, name } : item)))
            })
        },
        [env]
    )

    const removeVariable = useCallback(
        (index: number) => setDraft(env.filter((_, i) => i !== index)),
        [env]
    )

    // `mutate` is stable across renders; the mutation object is not
    const { mutate } = updateMutation
    const handleSave = useCallback(() => {
        if (!hasChanges) return
        Alert.alert('Redeploy stack?', 'Saving the environment redeploys the stack.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save', onPress: () => mutate(env) },
        ])
    }, [env, hasChanges, mutate])

    const handleDiscard = useCallback(() => setDraft(null), [])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={[
                        { title: 'Add variable', systemIcon: 'plus' },
                        {
                            title: 'Save',
                            systemIcon: 'square.and.arrow.down',
                            disabled: !hasChanges,
                        },
                        {
                            title: 'Discard changes',
                            destructive: true,
                            systemIcon: 'arrow.uturn.backward',
                            disabled: !hasChanges,
                        },
                    ]}
                    onPress={(e) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        if (e.nativeEvent.name === 'Add variable') addVariable()
                        else if (e.nativeEvent.name === 'Save') handleSave()
                        else if (e.nativeEvent.name === 'Discard changes') handleDiscard()
                    }}
                >
                    <Pressable
                        disabled={updateMutation.isPending}
                        style={({ pressed }) => ({
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: pressed ? 0.6 : 1,
                        })}
                    >
                        {updateMutation.isPending ? (
                            <ActivityIndicator size="small" />
                        ) : (
                            <Ionicons name="ellipsis-horizontal" size={36} color={COLORS.white} />
                        )}
                    </Pressable>
                </ContextMenu>
            ),
        })
    }, [navigation, hasChanges, updateMutation.isPending, addVariable, handleSave, handleDiscard])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: stackQuery.isLoading,
            hasData: env.length > 0,
            emptyLabel: 'No environment variables. Use the menu to add one.',
            isError: stackQuery.isError,
            errorLabel: stackQuery.error?.message || 'Failed to fetch stack environment variables',
        })
    }, [stackQuery.isLoading, stackQuery.isError, stackQuery.error, env.length])

    const { overrideProps } = useFlashlistProps(Placeholder)

    return (
        <FlashList
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={stackQuery.refetch} />}
            showsVerticalScrollIndicator={false}
            data={env}
            overrideProps={overrideProps}
            ListEmptyComponent={Placeholder}
            renderItem={({ item, index }) => (
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        editValue(index)
                    }}
                    style={{
                        backgroundColor: index % 2 === 0 ? COLORS.bgSecondary : COLORS.bgApp,
                        padding: 16,
                        paddingHorizontal: 20,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <View style={{ flexDirection: 'column', gap: 4, flex: 1 }}>
                        <Text
                            style={{ color: COLORS.primary, fontWeight: '600', fontSize: 14 }}
                            numberOfLines={1}
                        >
                            {item.name}
                        </Text>
                        <Text
                            style={{
                                color: COLORS.textMuted,
                                fontSize: 12,
                                fontFamily: 'monospace',
                            }}
                            numberOfLines={2}
                        >
                            {item.value}
                        </Text>
                    </View>
                    <ContextMenu
                        dropdownMenuMode={true}
                        actions={[
                            { title: 'Edit value', systemIcon: 'pencil' },
                            { title: 'Rename', systemIcon: 'textformat' },
                            { title: 'Delete', destructive: true, systemIcon: 'trash' },
                        ]}
                        onPress={(e) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            if (e.nativeEvent.name === 'Edit value') editValue(index)
                            else if (e.nativeEvent.name === 'Rename') renameVariable(index)
                            else if (e.nativeEvent.name === 'Delete') removeVariable(index)
                        }}
                    >
                        <View hitSlop={20}>
                            <Ionicons name="pencil" size={20} color={COLORS.textMuted} />
                        </View>
                    </ContextMenu>
                </TouchableOpacity>
            )}
        />
    )
}
