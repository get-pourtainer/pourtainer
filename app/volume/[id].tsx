import { deleteFile, renameFile, uploadFile } from '@/api/mutations'
import { fetchVolumeContent } from '@/api/queries'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import type { paths } from '@/lib/portainer/schema'
import { formatBytes } from '@/lib/utils'
import { downloadFile } from '@/lib/utils'
import { usePersistedStore } from '@/stores/persisted'
import { COLORS } from '@/theme'
import type { VolumeEntity } from '@/types/volume'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import { HeaderButton } from '@react-navigation/elements'
import * as Sentry from '@sentry/react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { formatDistance } from 'date-fns'
import * as DocumentPicker from 'expo-document-picker'
import type { DocumentPickerAsset } from 'expo-document-picker'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { ActionSheetIOS, Platform } from 'react-native'

//! need to think of replacement
export function showActionSheet(
    title: string,
    options: {
        label: string
        onPress: () => Promise<void> | void
        destructive?: boolean
        cancel?: boolean
    }[]
) {
    if (Platform.OS === 'ios') {
        const iosOptions = options.map((opt) => opt.label)
        const cancelButtonIndex = options.findIndex((opt) => opt.cancel)
        const destructiveButtonIndices: number[] = options.reduce((acc, opt, index) => {
            if (opt.destructive) {
                acc.push(index)
            }
            return acc
        }, [] as number[])

        ActionSheetIOS.showActionSheetWithOptions(
            {
                options: iosOptions,
                cancelButtonIndex,
                destructiveButtonIndex: destructiveButtonIndices,
                title,
                userInterfaceStyle: 'dark',
            },
            async (buttonIndex) => {
                if (buttonIndex !== cancelButtonIndex) {
                    const selectedOption = options[buttonIndex]
                    await selectedOption.onPress()
                }
            }
        )
    } else {
        Alert.alert(
            title,
            undefined,
            options.map((opt) => ({
                text: opt.label,
                style: opt.cancel ? 'cancel' : opt.destructive ? 'destructive' : 'default',
                onPress: opt.onPress,
            })),
            { cancelable: true }
        )
    }
}

export default function VolumeDetailScreen() {
    const currentConnection = usePersistedStore((state) => state.currentConnection)

    const { id, path = '/' } = useLocalSearchParams<{ id: string; path: string }>()
    const router = useRouter()
    const queryClient = useQueryClient()
    const navigation = useNavigation()
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchVisible, setIsSearchVisible] = useState(false)

    const { data: entities, isLoading } = useQuery({
        queryKey: ['volume-content', id, path],
        queryFn: async () => await fetchVolumeContent(id, path),
        staleTime: 10 * 1000, // 10 seconds
        gcTime: 15 * 1000, // 15 seconds garbage collection time
    })

    const uploadMutation = useMutation({
        mutationFn: async (file: DocumentPickerAsset) => {
            // Create a File object from the selected document
            const fileToUpload = {
                uri: file.uri,
                type: file.mimeType,
                name: file.name,
                file: file.file,
            } as any as File

            await uploadFile(id, path, fileToUpload, file.uri)
        },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            // Invalidate and refetch the volume content
            queryClient.invalidateQueries({ queryKey: ['volume-content', id, path] })
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('Error uploading file', error.message)
            Sentry.captureException(error)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (itemPath: string) => {
            await deleteFile(id, itemPath)
        },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            queryClient.invalidateQueries({ queryKey: ['volume-content', id, path] })
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('Error deleting item', error.message)
            Sentry.captureException(error)
        },
    })

    const renameMutation = useMutation({
        mutationFn: async ({ oldPath, newName }: { oldPath: string; newName: string }) => {
            await renameFile(id, oldPath, newName)
        },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            queryClient.invalidateQueries({ queryKey: ['volume-content', id, path] })
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('Error renaming item', error.message)
            Sentry.captureException(error)
        },
    })

    const downloadFileMutation = useMutation({
        mutationFn: async (props: Parameters<typeof downloadFile>[0]) => {
            await downloadFile(props)
        },
        onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert('Error downloading file', error.message)
            Sentry.captureException(error)
        },
    })
    const navigateToPath = useCallback(
        (newPath: string) => {
            router.push({
                pathname: '/volume/[id]',
                params: { id, path: newPath },
            })
        },
        [id, router]
    )

    const handleUpload = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
            })

            if (!result.canceled) {
                await uploadMutation.mutateAsync(result.assets[0])
            }
        } catch (error) {
            Sentry.captureException(error)
            Alert.alert(
                'Error picking document',
                error instanceof Error ? error.message : 'Unknown error'
            )
        }
    }, [uploadMutation])

    const handleBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

        if (path === '/') {
            router.back()
            return
        }
        const parentPath = path.split('/').slice(0, -1).join('/') || '/'
        router.push({
            pathname: '/volume/[id]',
            params: { id, path: parentPath },
        })
    }, [path, router, id])

    const handleLongPress = useCallback(
        (item: VolumeEntity) => {
            const itemPath = `${path}/${item.Name}`.replace('//', '/')

            const actions = []

            if (!item.Dir) {
                actions.push({
                    label: 'Download',
                    onPress: () => {
                        console.log('Downloading file:', `${path}/${item.Name}`.replace('//', '/'))
                        downloadFileMutation.mutate({
                            volumeName: id,
                            filePath: `${path}/${item.Name}`.replace('//', '/'),
                            fileName: item.Name,
                            endpointId: currentConnection?.currentEndpointId!,
                        })
                    },
                })
            }

            actions.push({
                label: 'Rename',
                onPress: () => {
                    Alert.prompt(
                        'Rename',
                        `Enter new name for ${item.Dir ? 'folder' : 'file'}:`,
                        async (newName) => {
                            if (!newName || newName === item.Name) return
                            await renameMutation.mutateAsync({
                                oldPath: itemPath,
                                newName,
                            })
                        },
                        'plain-text',
                        item.Name
                    )
                },
            })

            actions.push({
                label: 'Delete',
                onPress: async () => {
                    Alert.alert(
                        'Confirm Delete',
                        `Are you sure you want to delete this ${item.Dir ? 'folder' : 'file'}?`,
                        [
                            {
                                text: 'Cancel',
                                style: 'cancel',
                            },
                            {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                    await deleteMutation.mutateAsync(itemPath)
                                },
                            },
                        ]
                    )
                },
                destructive: true,
            })

            actions.push({
                label: 'Cancel',
                onPress: () => {},
                cancel: true,
            })

            showActionSheet(item.Name, actions)
        },
        [
            path,
            deleteMutation,
            renameMutation,
            currentConnection?.currentEndpointId,
            id,
            downloadFileMutation.mutate,
        ]
    )

    const handlePress = useCallback(
        (item: VolumeEntity) => {
            if (item.Dir) {
                navigateToPath(`${path}/${item.Name}`.replace('//', '/'))
            } else {
                handleLongPress(item)
            }
        },
        [path, navigateToPath, handleLongPress]
    )

    const filteredEntities = useMemo(() => {
        if (!entities) return []
        const query = searchQuery.toLowerCase().trim()
        if (!query) return entities

        return entities.filter((item) => item.Name.toLowerCase().includes(query))
    }, [entities, searchQuery])

    const isHeaderRightLoading = useMemo(() => {
        return (
            deleteMutation.isPending || renameMutation.isPending || downloadFileMutation.isPending
        )
    }, [downloadFileMutation.isPending, deleteMutation.isPending, renameMutation.isPending])

    useLayoutEffect(() => {
        const currentFolderName =
            path === '/' ? 'Browse' : path.split('/').filter(Boolean).pop() || 'Volume Details'

        navigation.setOptions({
            headerLeft: () => (
                <HeaderButton onPress={handleBack}>
                    <Ionicons
                        name="chevron-back"
                        size={isLiquidGlassAvailable() ? 32 : 24}
                        color={COLORS.text}
                    />
                </HeaderButton>
            ),
            headerRight: isHeaderRightLoading
                ? () => (
                      <HeaderItem>
                          <ActivityIndicator size="small" />
                      </HeaderItem>
                  )
                : () => (
                      <HeaderTouchableOpacity onPress={() => setIsSearchVisible((v) => !v)}>
                          <Ionicons name="search" size={36} color={COLORS.text} />
                      </HeaderTouchableOpacity>
                  ),
            headerBackVisible: false,
            title: currentFolderName,
        })
    }, [navigation, handleBack, path, isHeaderRightLoading])

    const renderItem = useCallback(
        ({
            item,
        }: {
            item: paths['/endpoints/{id}/docker/v2/browse/ls']['get']['responses']['200']['content']['application/json'][number]
        }) => {
            const isDirectory = item.Dir
            const timestamp = new Date(item.ModTime * 1000)
            const timeAgo = formatDistance(timestamp, new Date(), { addSuffix: true })

            return (
                <Pressable
                    onPress={() => handlePress(item)}
                    onLongPress={() => handleLongPress(item)}
                    style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                >
                    <View style={styles.itemContent}>
                        <View style={styles.itemLeftSection}>
                            <Ionicons
                                name={isDirectory ? 'folder' : 'document'}
                                size={24}
                                color={isDirectory ? '#FFB800' : '#666'}
                            />
                            <Text style={styles.itemName}>{item.Name}</Text>
                        </View>
                        <View style={styles.itemRightSection}>
                            <Text style={styles.itemDetails}>
                                {!isDirectory && formatBytes(item.Size)}
                            </Text>
                            <Text style={styles.itemTime}>{timeAgo}</Text>
                        </View>
                    </View>
                </Pressable>
            )
        },
        [handlePress, handleLongPress]
    )

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={styles.container}
            scrollEnabled={false}
            contentContainerStyle={{
                flex: 1,
            }}
        >
            {isSearchVisible && (
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search files and folders..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoComplete="off"
                        autoCorrect={false}
                        autoFocus={true}
                        keyboardAppearance="dark"
                    />
                    <Pressable
                        onPress={() => {
                            setIsSearchVisible(false)
                            setSearchQuery('')
                        }}
                        style={styles.searchCancelButton}
                    >
                        <Text style={styles.searchCancelText}>Cancel</Text>
                    </Pressable>
                </View>
            )}
            <View style={styles.pathBar}>
                <Text style={styles.pathText} numberOfLines={1}>
                    {path}
                </Text>
            </View>
            {isLoading ? (
                <View style={styles.contentLoadingContainer}>
                    <ActivityIndicator />
                </View>
            ) : (
                <FlatList
                    data={filteredEntities}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.Name}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={() =>
                        searchQuery.trim() !== '' ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    No files or folders match your search
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}
            <Pressable
                onPress={handleUpload}
                style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
                disabled={isHeaderRightLoading || uploadMutation.isPending}
            >
                {uploadMutation.isPending ? (
                    <ActivityIndicator size="small" />
                ) : (
                    <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
                )}
            </Pressable>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // position: 'relative',
    },
    contentLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pathBar: {
        padding: 12,
        backgroundColor: COLORS.primaryDark,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.hr,
    },
    pathText: {
        fontSize: 14,
        color: COLORS.text,
    },
    item: {
        padding: 16,
        backgroundColor: COLORS.bgSecondary,
    },
    itemPressed: {
        backgroundColor: COLORS.hrMuted,
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemLeftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    itemRightSection: {
        alignItems: 'flex-end',
    },
    itemName: {
        marginLeft: 12,
        fontSize: 16,
        color: COLORS.primary,
    },
    itemDetails: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    itemTime: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.hrPrimary,
    },
    fab: {
        position: 'absolute',
        bottom: 150,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    fabPressed: {
        opacity: 0.8,
    },
    headerButton: {
        marginRight: 15,
        padding: 8,
        borderRadius: 8,
    },
    headerButtonPressed: {
        opacity: 0.7,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
        marginTop: 20,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textMuted,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: COLORS.bgApp,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.hr,
    },
    searchInput: {
        flex: 1,
        height: 36,
        backgroundColor: COLORS.bgSecondary,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        marginRight: 8,
        color: COLORS.text,
    },
    searchCancelButton: {
        padding: 8,
    },
    searchCancelText: {
        color: COLORS.primary,
        fontSize: 16,
    },
})
