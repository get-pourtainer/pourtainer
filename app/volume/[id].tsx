import { deleteFile, renameFile, uploadFile } from '@/api/mutations'
import { fetchVolumeContent } from '@/api/queries'
import { showActionSheet } from '@/components/ActionSheet'
import { formatBytes } from '@/lib/utils'
import { previewFile } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import type { VolumeEntity } from '@/types/volume'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { formatDistance } from 'date-fns'
import * as DocumentPicker from 'expo-document-picker'
import type { DocumentPickerAsset } from 'expo-document-picker'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { UnistylesRuntime } from 'react-native-unistyles'

export default function VolumeDetailScreen() {
    const { id, path = '/' } = useLocalSearchParams<{ id: string; path: string }>()
    const router = useRouter()
    const queryClient = useQueryClient()
    const navigation = useNavigation()
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchVisible, setIsSearchVisible] = useState(false)
    const theme = UnistylesRuntime.getTheme()
    const { currentEndpointId } = useAuthStore()

    const currentFolderName =
        path === '/' ? 'Browse' : path.split('/').filter(Boolean).pop() || 'Volume Details'

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

    useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <Pressable onPress={handleBack}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text.white} />
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
                    <Ionicons name="search" size={24} color={theme.colors.text.white} />
                </Pressable>
            ),
            headerBackVisible: false,
            title: currentFolderName,
        })
    }, [navigation, handleBack, currentFolderName, theme.colors.text.white])

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

    const navigateToPath = (newPath: string) => {
        router.push({
            pathname: '/volume/[id]',
            params: { id, path: newPath },
        })
    }

    const handlePress = async (item: VolumeEntity) => {
        if (item.Dir) {
            navigateToPath(`${path}/${item.Name}`.replace('//', '/'))
        } else {
            try {
                console.log('Previewing file:', `${path}/${item.Name}`.replace('//', '/'))
                await previewFile({
                    volumeName: id,
                    filePath: `${path}/${item.Name}`.replace('//', '/'),
                    fileName: item.Name,
                    endpointId: currentEndpointId!,
                })
            } catch (error) {
                console.error('Error opening file:', error)
                // You might want to show an error message to the user here
            }
        }
    }

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

    const handleLongPress = useCallback(
        (item: VolumeEntity) => {
            const itemPath = `${path}/${item.Name}`.replace('//', '/')

            showActionSheet(item.Name, [
                {
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
                },
                {
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
                },
                {
                    label: 'Cancel',
                    onPress: () => {},
                    cancel: true,
                },
            ])
        },
        [path, deleteMutation, renameMutation]
    )

    const renderItem = ({ item }: { item: VolumeEntity }) => {
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
    }

    const filteredEntities = useMemo(() => {
        if (!entities) return []
        const query = searchQuery.toLowerCase().trim()
        if (!query) return entities

        return entities.filter((item) => item.Name.toLowerCase().includes(query))
    }, [entities, searchQuery])

    return (
        <View style={styles.container}>
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
            {/* <Pressable
                onPress={handleUpload}
                style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            >
                <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
            </Pressable> */}
        </View>
    )
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.app,
    },
    contentLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.app,
    },
    pathBar: {
        padding: 12,
        backgroundColor: theme.colors.volume.item.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primaryLight,
    },
    pathText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    item: {
        padding: 16,
        backgroundColor: theme.colors.volume.item.background,
    },
    itemPressed: {
        backgroundColor: theme.colors.volume.item.backgroundPressed,
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
        color: theme.colors.text.primary,
    },
    itemDetails: {
        fontSize: 12,
        color: theme.colors.text.secondary,
    },
    itemTime: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: 4,
    },
    separator: {
        height: 1,
        backgroundColor: theme.colors.volume.item.separator,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
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
        color: theme.colors.text.secondary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: theme.colors.volume.search.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.volume.item.separator,
    },
    searchInput: {
        flex: 1,
        height: 36,
        backgroundColor: theme.colors.volume.search.input,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        marginRight: 8,
        color: theme.colors.volume.search.text,
    },
    searchCancelButton: {
        padding: 8,
    },
    searchCancelText: {
        color: theme.colors.primary,
        fontSize: 16,
    },
}))
