import { usePersistedStore } from '@/stores/persisted'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import ReactNativeBlobUtil from 'react-native-blob-util'

export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

export async function downloadFile({
    volumeName,
    filePath,
    fileName,
    endpointId,
}: {
    volumeName: string
    filePath: string
    fileName: string
    endpointId: string
}) {
    try {
        // Create a temporary directory if it doesn't exist
        const tempDir = `${FileSystem.cacheDirectory}preview/`
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true }).catch(() => {})

        const currentConnection = usePersistedStore.getState().currentConnection

        if (!currentConnection) {
            throw new Error('No connection found')
        }

        const fullUrl = `${currentConnection.baseUrl}/api/endpoints/${endpointId}/docker/v2/browse/get?volumeID=${encodeURIComponent(
            volumeName
        )}&path=${encodeURIComponent(filePath)}`

        const response = await ReactNativeBlobUtil.config({
            trusty: true,
        }).fetch('GET', fullUrl, {
            'x-api-key': currentConnection.apiToken,
        })

        // Generate temporary file path
        const localFilePath = `${tempDir}${fileName}`

        // Save the file
        await FileSystem.writeAsStringAsync(localFilePath, response.base64(), {
            encoding: FileSystem.EncodingType.Base64,
        })

        // Check if sharing is available (should be available on both iOS and Android)
        const isSharingAvailable = await Sharing.isAvailableAsync()

        if (isSharingAvailable) {
            await Sharing.shareAsync(localFilePath, {
                UTI: Platform.OS === 'ios' ? 'public.item' : undefined, // UTI for iOS
                mimeType: Platform.OS === 'android' ? 'application/octet-stream' : undefined, // MIME type for Android
                dialogTitle: `Preview ${fileName}`,
            })
        } else {
            throw new Error('Sharing is not available on this platform')
        }
    } catch (error) {
        console.error('Error previewing file:', error)
        throw error
    }
}
