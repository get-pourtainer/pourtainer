import { deleteImage } from '@/api/mutations'
import { fetchImages } from '@/api/queries'
import { type ActionSheetOption, showActionSheet } from '@/components/ActionSheet'
import { Badge } from '@/components/Badge'
import type { Image } from '@/types/image'
import Clipboard from '@react-native-clipboard/clipboard'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation } from 'expo-router'
import { useLayoutEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'

// Helper function to format bytes to human readable size
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

function ImageRow({
    image,
    onPress,
    index,
    total,
}: {
    image: Image
    onPress: () => void
    index?: number
    total?: number
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.imageRow,
                index !== undefined &&
                    total !== undefined &&
                    index !== total - 1 &&
                    styles.rowBorder,
            ]}
        >
            <Text style={styles.imageTitle}>{image.tags?.[0] || image.id.substring(7, 19)}</Text>

            <View style={styles.badgeContainer}>
                <Badge
                    label={image.id.substring(7, 17)}
                    color="#475569"
                    backgroundColor="#e2e8f0"
                    monospace={true}
                />

                <Badge label={formatBytes(image.size)} color="#0369a1" backgroundColor="#bae6fd" />

                <Badge
                    label={new Date(image.created * 1000).toLocaleDateString()}
                    color="#15803d"
                    backgroundColor="#bbf7d0"
                />

                {image.used === false && (
                    <Badge label="Unused" color="#b91c1c" backgroundColor="#fecaca" />
                )}
            </View>
        </TouchableOpacity>
    )
}

export default function ImagesScreen() {
    const [searchString, setSearchString] = useState('')
    const navigation = useNavigation()
    const queryClient = useQueryClient()

    const imagesQuery = useQuery({
        queryKey: ['images'],
        queryFn: fetchImages,
    })

    useLayoutEffect(() => {
        const theme = UnistylesRuntime.getTheme()

        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Search images...',
                hideWhenScrolling: true,
                barTintColor: theme.colors.searchBar.background,
                textColor: theme.colors.searchBar.text,
                placeholderTextColor: theme.colors.searchBar.placeholder,
                onChangeText: (event: any) => setSearchString(event.nativeEvent.text),
            },
        })
    }, [navigation])

    // Show loading state
    if (imagesQuery.isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={styles.loadingIndicator.color} />
            </View>
        )
    }

    // Show error if query has an error
    if (imagesQuery.error) {
        return (
            <View style={styles.centerContainer}>
                <Text>Error loading images</Text>
            </View>
        )
    }

    const filteredImages = imagesQuery.data?.filter((image) => {
        const query = searchString.toLowerCase()
        const imageName = (image.tags?.[0] || image.id).toLowerCase()
        return imageName.includes(query)
    })

    const handleImagePress = (image: Image) => {
        const imageTitle = image.tags?.[0] || image.id.substring(7, 19)

        const options: ActionSheetOption[] = [
            {
                label: 'Copy ID',
                onPress: async () => {
                    Clipboard.setString(image.id)
                },
            },
            {
                label: 'Delete',
                destructive: true,
                onPress: async () => {
                    try {
                        await deleteImage(image.id)
                        queryClient.invalidateQueries({ queryKey: ['images'] })
                    } catch (error) {
                        Alert.alert(
                            'Error',
                            error instanceof Error ? error.message : 'Failed to delete image'
                        )
                    }
                },
            },
            {
                label: 'Force Delete',
                destructive: true,
                onPress: async () => {
                    try {
                        await deleteImage(image.id, { force: true })
                        queryClient.invalidateQueries({ queryKey: ['images'] })
                    } catch (error) {
                        Alert.alert(
                            'Error',
                            error instanceof Error ? error.message : 'Failed to force delete image'
                        )
                    }
                },
            },
            {
                label: 'Cancel',
                cancel: true,
                destructive: false,
                onPress: () => {},
            },
        ]

        showActionSheet(imageTitle, options)
    }

    return (
        <FlatList
            data={filteredImages}
            renderItem={({ item, index }) => (
                <ImageRow
                    image={item}
                    index={index}
                    total={filteredImages?.length}
                    onPress={() => handleImagePress(item)}
                />
            )}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
                <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No images match your search</Text>
                </View>
            }
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.listContainer}
            style={styles.list}
            refreshControl={
                <RefreshControl
                    refreshing={imagesQuery.isRefetching}
                    onRefresh={imagesQuery.refetch}
                />
            }
        />
    )
}

const styles = StyleSheet.create((theme) => ({
    imageRow: {
        padding: theme.spacing.md,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primaryLight,
    },
    imageTitle: StyleSheet.flatten([
        theme.typography.subtitle,
        theme.shadows.text,
        {
            color: theme.colors.text.white,
            marginBottom: theme.spacing.sm,
        },
    ]),
    badgeContainer: {
        flexDirection: 'row',
        marginTop: theme.spacing.sm,
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        width: '100%',
    },
    listContainer: {
        backgroundColor: theme.colors.background.list,
        position: 'relative',
        borderTopWidth: 1,
        borderTopColor: theme.colors.primaryLight,
    },
    list: {
        backgroundColor: theme.colors.background.list,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.list,
    },
    loadingIndicator: {
        color: theme.colors.text.white,
    },
    noResultsContainer: {
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    noResultsText: {
        fontSize: theme.typography.subtitle.fontSize,
        color: theme.colors.text.light,
    },
}))
