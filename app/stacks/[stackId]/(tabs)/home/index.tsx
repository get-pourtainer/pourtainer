import { updateStackFile } from '@/api/mutations'
import { fetchStackFile } from '@/api/queries'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import buildPlaceholder from '@/components/base/Placeholder'
import { usePersistedStore } from '@/stores/persisted'
import { COLORS } from '@/theme'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { NotificationFeedbackType } from 'expo-haptics'
import { router, useGlobalSearchParams, useNavigation } from 'expo-router'
import yaml from 'js-yaml'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Alert, Pressable, TextInput } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

export default function StackHomeScreen() {
    const { stackId } = useGlobalSearchParams<{
        stackId: string
    }>()
    const navigation = useNavigation()
    const queryClient = useQueryClient()

    const acknowledged = usePersistedStore((state) => state.acknowledgments)
    const acknowledge = usePersistedStore((state) => state.acknowledge)

    const stackFileQuery = useQuery({
        queryKey: ['stack', stackId, 'file'],
        queryFn: async () => fetchStackFile(Number(stackId)),
        enabled: !!stackId,
    })

    const [editedContent, setEditedContent] = useState('')
    const [hasChanges, setHasChanges] = useState(false)

    // Initialize content when data loads
    useEffect(() => {
        if (stackFileQuery.data?.StackFileContent) {
            setEditedContent(stackFileQuery.data.StackFileContent)
            setHasChanges(false)
        }
    }, [stackFileQuery.data?.StackFileContent])

    const updateMutation = useMutation({
        mutationFn: async () => {
            await updateStackFile(Number(stackId), editedContent)
        },
        onSuccess: () => {
            Haptics.notificationAsync(NotificationFeedbackType.Success)
            setHasChanges(false)
            queryClient.invalidateQueries({ queryKey: ['stack', stackId, 'file'] })
            Alert.alert('Success', 'Stack file updated successfully')
        },
        onError: (error) => {
            Haptics.notificationAsync(NotificationFeedbackType.Error)
            Sentry.captureException(error)
            Alert.alert('Error updating stack file', error.message)
        },
    })

    const validateYaml = useCallback(() => {
        try {
            yaml.load(editedContent)
            return { valid: true }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown YAML syntax error'
            return { valid: false, error: errorMessage }
        }
    }, [editedContent])

    const handleSave = useCallback(() => {
        // Validate YAML before saving
        const validation = validateYaml()

        if (!validation.valid) {
            Haptics.notificationAsync(NotificationFeedbackType.Error)
            Alert.alert('Invalid YAML', `${validation.error || 'Unknown YAML syntax error'}`, [
                { text: 'OK', style: 'default' },
            ])
            return
        }

        Alert.alert('Update Stack', 'This will update and redeploy your stack. Continue?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Update',
                onPress: () => updateMutation.mutate(),
            },
        ])
    }, [updateMutation, validateYaml])

    const handleClose = useCallback(() => {
        if (!acknowledged.swipeLeftStack) {
            acknowledge('swipeLeftStack')
            Alert.alert('Quick Tip', 'You can swipe left to go back!', [
                { text: 'Good to know!', style: 'cancel' },
            ])
        }
        if (router.canGoBack()) {
            router.back()
        } else {
            router.replace('/(tabs)/containers')
        }
    }, [acknowledged.swipeLeftStack, acknowledge])

    useLayoutEffect(() => {
        navigation.setOptions({
            title: 'compose.yaml',
            headerRight: () => (
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={[
                        {
                            title: 'Save',
                            systemIcon: 'square.and.arrow.down',
                            disabled: !hasChanges,
                        },
                        {
                            title: 'Close',
                            destructive: true,
                            systemIcon: 'xmark',
                        },
                    ]}
                    onPress={(e) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        if (e.nativeEvent.name === 'Save') {
                            handleSave()
                        } else if (e.nativeEvent.name === 'Close') {
                            handleClose()
                        }
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
    }, [navigation, hasChanges, updateMutation.isPending, handleSave, handleClose])

    const Placeholder = useMemo(() => {
        return buildPlaceholder({
            isLoading: stackFileQuery.isLoading,
            hasData: !!stackFileQuery.data,
            emptyLabel: 'No stack file found',
            isError: stackFileQuery.isError,
            errorLabel: 'Failed to fetch stack file',
        })
    }, [stackFileQuery.isLoading, stackFileQuery.data, stackFileQuery.isError])

    return (
        <>
            {Placeholder ? (
                Placeholder
            ) : (
                <TextInput
                    value={editedContent}
                    onChangeText={(text) => {
                        setEditedContent(text)
                        setHasChanges(text !== stackFileQuery.data?.StackFileContent)
                    }}
                    multiline={true}
                    editable={true}
                    style={{
                        flex: 1,
                        padding: 16,
                        fontFamily: 'monospace',
                        fontSize: 16,
                        color: COLORS.text,
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    keyboardAppearance="dark"
                    keyboardType="default"
                />
            )}
        </>
    )
}
