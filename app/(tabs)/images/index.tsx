import { deleteImage, pullImage } from '@/api/mutations'
import { fetchImages } from '@/api/queries'
import { type ActionSheetOption, showActionSheet } from '@/components/ActionSheet'
import { Badge } from '@/components/Badge'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import type { Image } from '@/types/image'
import { Ionicons } from '@expo/vector-icons'
import Clipboard from '@react-native-clipboard/clipboard'
import * as Sentry from '@sentry/react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useNavigation } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native'

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

    const pullImageMutation = useMutation({
        mutationFn: async (imageName: string) => {
            await pullImage(imageName)
        },
        onSuccess: () => {
            imagesQuery.refetch()
        },
        onError: (error) => {
            Sentry.captureException(error)
            Alert.alert('Error', error.message)
        },
    })

    const filteredImages = useMemo(() => {
        if (!imagesQuery.data) return []
        return imagesQuery.data.filter((image) => {
            const query = searchString.toLowerCase()
            const imageName = (image.tags?.[0] || image.id).toLowerCase()
            return imageName.includes(query)
        })
    }, [imagesQuery.data, searchString])

    const handleImagePress = useCallback(
        (image: Image) => {
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
                                error instanceof Error
                                    ? error.message
                                    : 'Failed to force delete image'
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
        },
        [queryClient]
    )

    const Placeholder = useMemo(() => {
        const isSearch = searchString.trim() !== ''

        const emptyImages = buildPlaceholder({
            isLoading: imagesQuery.isLoading,
            isError: imagesQuery.isError,
            hasData: filteredImages.length > 0,
            emptyLabel: isSearch ? 'No images match your search' : 'No images found',
            errorLabel: 'Error loading images',
        })

        return emptyImages
    }, [imagesQuery.isLoading, imagesQuery.isError, filteredImages.length, searchString])

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: pullImageMutation.isPending
                ? () => <ActivityIndicator size="small" />
                : () => (
                      <HeaderTouchableOpacity
                          style={{
                              height: 32,
                              width: 32,
                          }}
                          onPress={() => {
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                              Alert.prompt(
                                  'Pull Image',
                                  'Enter the image name',
                                  [
                                      {
                                          text: 'Cancel',
                                          style: 'cancel',
                                      },
                                      {
                                          text: 'Pull image',
                                          onPress: (imageName) => {
                                              if (!imageName) return
                                              pullImageMutation.mutate(imageName)
                                          },
                                      },
                                  ],
                                  'plain-text',
                                  'hello-world:latest'
                              )
                          }}
                      >
                          <Ionicons name="add-circle-sharp" size={32} color={COLORS.primaryLight} />
                      </HeaderTouchableOpacity>
                  ),
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
    }, [navigation, pullImageMutation.isPending, pullImageMutation.mutate])

    if (Placeholder) {
        return Placeholder
    }

    return (
        <FlatList
            data={filteredImages}
            renderItem={({ item: image }) => (
                <ImageRow image={image} onPress={() => handleImagePress(image)} />
            )}
            keyExtractor={(image) => image.id}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl onRefresh={imagesQuery.refetch} />}
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
