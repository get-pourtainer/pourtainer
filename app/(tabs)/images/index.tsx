import { deleteImage, pullImage } from '@/api/mutations'
import { fetchImages } from '@/api/queries'
import { Badge } from '@/components/Badge'
import ActivityIndicator from '@/components/base/ActivityIndicator'
import HeaderItem from '@/components/base/HeaderItem'
import { HeaderTouchableOpacity } from '@/components/base/HeaderTouchableOpacity'
import buildPlaceholder from '@/components/base/Placeholder'
import RefreshControl from '@/components/base/RefreshControl'
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme'
import type { Image } from '@/types/image'
import Alert from '@blazejkustra/react-native-alert'
import { Ionicons } from '@expo/vector-icons'
import Clipboard from '@react-native-clipboard/clipboard'
import * as Sentry from '@sentry/react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { useNavigation } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { StyleSheet } from 'react-native'
import { FlatList, Text, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

function ImageRow({
    image,
}: {
    image: Image
    index?: number
    total?: number
}) {
    return (
        <View style={styles.imageRow}>
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
        </View>
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
            Alert.alert('Error pulling image', error.message)
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

    const handleImageAction = useCallback(
        async (image: Image, actionName: string) => {
            if (actionName === 'Copy ID') {
                Clipboard.setString(image.id)
            } else if (actionName === 'Delete') {
                try {
                    await deleteImage(image.id)
                    queryClient.invalidateQueries({ queryKey: ['images'] })
                } catch (error) {
                    Sentry.captureException(error)
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    Alert.alert(
                        'Error',
                        error instanceof Error ? error.message : 'Failed to delete image'
                    )
                }
            } else if (actionName === 'Force Delete') {
                try {
                    await deleteImage(image.id, { force: true })
                    queryClient.invalidateQueries({ queryKey: ['images'] })
                } catch (error) {
                    Sentry.captureException(error)
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                    Alert.alert(
                        'Error',
                        error instanceof Error ? error.message : 'Failed to force delete image'
                    )
                }
            } else {
                Alert.alert(
                    'Coming soon :)',
                    'Give us a quick rating to push this feature even faster?',
                    [
                        {
                            text: 'Sure!',
                            style: 'default',
                            onPress: () => {
                                StoreReview.requestReview()
                            },
                        },
                        { text: 'I like waiting', style: 'destructive' },
                    ]
                )
            }
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
                ? () => (
                      <HeaderItem>
                          <ActivityIndicator size="small" />
                      </HeaderItem>
                  )
                : () => (
                      <HeaderTouchableOpacity
                          onPress={() => {
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
                                          onPress: (imageName?: string) => {
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
                          <Ionicons
                              name={isLiquidGlassAvailable() ? 'add-sharp' : 'add-circle'}
                              size={36}
                              color={COLORS.primaryLight}
                          />
                      </HeaderTouchableOpacity>
                  ),
            headerSearchBarOptions: {
                placeholder: 'Search images...',
                hideWhenScrolling: true,
                barTintColor: COLORS.bgSecondary,
                textColor: COLORS.text,
                onChangeText: (event: any) => setSearchString(event.nativeEvent.text),
                autoCapitalize: 'none',
                tintColor: COLORS.primary,
                hintTextColor: COLORS.textMuted,
                headerIconColor: COLORS.primary,
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
                <ContextMenu
                    dropdownMenuMode={true}
                    actions={[
                        {
                            title: 'Copy ID',
                            systemIcon: 'doc.on.doc',
                        },
                        {
                            title: 'Edit',
                            systemIcon: 'pencil',
                        },
                        {
                            title: 'Delete',
                            destructive: true,
                            systemIcon: 'trash',
                        },
                        {
                            title: 'Force Delete',
                            destructive: true,
                            systemIcon: 'trash.fill',
                        },
                    ]}
                    onPress={(e) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        handleImageAction(image, e.nativeEvent.name)
                    }}
                >
                    <ImageRow image={image} />
                </ContextMenu>
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
