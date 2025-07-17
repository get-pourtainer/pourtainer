import { deleteImage } from '@/api/mutations'
import { fetchImages } from '@/api/queries'
import { type ActionSheetOption, showActionSheet } from '@/components/ActionSheet'
import { Badge } from '@/components/Badge'
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import type { Image } from '@/types/image'
import Clipboard from '@react-native-clipboard/clipboard'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation } from 'expo-router'
import { useLayoutEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

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
}: {
    image: Image
    onPress: () => void
    index?: number
    total?: number
}) {
    return (
        <TouchableOpacity onPress={onPress} style={styles.imageRow}>
            <Text style={styles.imageTitle}>{image.tags?.[0] || image.id.substring(7, 19)}</Text>

            <View style={styles.badgeContainer}>
                <Badge
                    label={image.id.substring(7, 17)}
                    color={COLORS.textMuted}
                    backgroundColor={COLORS.bgSecondary}
                    monospace={true}
                />

                <Badge
                    label={formatBytes(image.size)}
                    color={COLORS.primaryLight}
                    backgroundColor={COLORS.primaryDark}
                />

                <Badge
                    label={new Date(image.created * 1000).toLocaleDateString()}
                    color={COLORS.successLight}
                    backgroundColor={COLORS.successDark}
                />

                {image.used === false && (
                    <Badge
                        label="Unused"
                        color={COLORS.errorLight}
                        backgroundColor={COLORS.errorDark}
                    />
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
        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: 'Search images...',
                hideWhenScrolling: true,
                barTintColor: COLORS.bgSecondary,
                textColor: COLORS.text,
                tintColor: COLORS.primary,
                onChangeText: (event: any) => setSearchString(event.nativeEvent.text),

                //! do not seem to work
                hintTextColor: 'red',
                placeholderTextColor: 'red',
                autoCapitalize: 'none',
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
            renderItem={({ item: image }) => (
                <ImageRow image={image} onPress={() => handleImagePress(image)} />
            )}
            keyExtractor={(image) => image.id}
            ListEmptyComponent={
                <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No images match your search</Text>
                </View>
            }
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
                <RefreshControl
                    refreshing={imagesQuery.isRefetching}
                    onRefresh={imagesQuery.refetch}
                />
            }
        />
    )
}

const styles = StyleSheet.create({
    imageRow: {
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.hr,
    },
    imageTitle: StyleSheet.flatten([
        TYPOGRAPHY.subtitle,
        SHADOWS.text,
        {
            color: COLORS.text,
            marginBottom: SPACING.sm,
        },
    ]),
    badgeContainer: {
        flexDirection: 'row',
        marginTop: SPACING.sm,
        gap: SPACING.sm,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        width: '100%',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingIndicator: {
        color: COLORS.text,
    },
    noResultsContainer: {
        alignItems: 'center',
        padding: SPACING.lg,
    },
    noResultsText: {
        fontSize: TYPOGRAPHY.subtitle.fontSize,
        color: COLORS.textMuted,
    },
})
