import { deleteFile, renameFile, uploadFile } from '@/api/mutations'
import { fetchVolumeContent } from '@/api/queries'
import { type ActionSheetOption, showActionSheet } from '@/components/ActionSheet'
import { formatBytes } from '@/lib/utils'
import { downloadFile } from '@/lib/utils'
import { usePersistedStore } from '@/stores/persisted'
import { COLORS } from '@/theme'
import type { VolumeEntity } from '@/types/volume'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { formatDistance } from 'date-fns'
import * as DocumentPicker from 'expo-document-picker'
import type { DocumentPickerAsset } from 'expo-document-picker'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'

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
        queryFn: () => fetchVolumeContent(id, path),
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
            // Invalidate and refetch the volume content
            queryClient.invalidateQueries({ queryKey: ['volume-content', id, path] })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (itemPath: string) => {
            await deleteFile(id, itemPath)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['volume-content', id, path] })
        },
    })

    const renameMutation = useMutation({
        mutationFn: async ({ oldPath, newName }: { oldPath: string; newName: string }) => {
            await renameFile(id, oldPath, newName)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['volume-content', id, path] })
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
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
            })

            if (!result.canceled) {
                await uploadMutation.mutateAsync(result.assets[0])
            }
        } catch (error) {
            console.error('Error picking document:', error)
        }
    }, [uploadMutation])

    const handleBack = useCallback(() => {
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

            const actions: ActionSheetOption[] = []

            if (!item.Dir) {
                actions.push({
                    label: 'Download',
                    onPress: async () => {
                        try {
                            console.log(
                                'Downloading file:',
                                `${path}/${item.Name}`.replace('//', '/')
                            )
                            await downloadFile({
                                volumeName: id,
                                filePath: `${path}/${item.Name}`.replace('//', '/'),
                                fileName: item.Name,
                                endpointId: currentConnection?.currentEndpointId!,
                            })
                        } catch (error) {
                            console.error('Error opening file:', error)
                            Alert.alert('Error', 'Failed to download file')
                        }
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
                            try {
                                await renameMutation.mutateAsync({
                                    oldPath: itemPath,
                                    newName,
                                })
                            } catch (error) {
                                Alert.alert('Error', 'Failed to rename item')
                            }
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
                                    try {
                                        await deleteMutation.mutateAsync(itemPath)
                                    } catch (error) {
                                        Alert.alert('Error', 'Failed to delete item')
                                    }
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
        [path, deleteMutation, renameMutation, currentConnection?.currentEndpointId, id]
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

    useLayoutEffect(() => {
        const currentFolderName =
            path === '/' ? 'Browse' : path.split('/').filter(Boolean).pop() || 'Volume Details'

        navigation.setOptions({
            headerLeft: () => (
                <Pressable onPress={handleBack}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </Pressable>
            ),
            headerRight: () => (
                <Pressable
                    onPress={() => setIsSearchVisible((v) => !v)}
                    style={({ pressed }) => [
                        styles.headerButton,
                        pressed && styles.headerButtonPressed,
                    ]}
                >
                    <Ionicons name="search" size={24} color={COLORS.text} />
                </Pressable>
            ),
            headerBackVisible: false,
            title: currentFolderName,
        })
    }, [navigation, handleBack, path])

    const renderItem = useCallback(
        ({ item }: { item: VolumeEntity }) => {
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
                        autoFocus={true}
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
                    <ActivityIndicator size="large" />
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
            >
                {uploadMutation.isPending || deleteMutation.isPending ? (
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
