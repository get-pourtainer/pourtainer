import ReactNativeBlobUtil from 'react-native-blob-util'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth'

export async function restartContainer(id: string): Promise<void> {
    console.log('Restarting container:', id)
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/containers/${id}/restart`,
            {
                method: 'POST',
            }
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error('Failed to restart container')
        }
    } catch (error) {
        console.error('Error restarting container:', error)
        throw error
    }
}

export async function stopContainer(id: string): Promise<void> {
    console.log('Stopping container:', id)
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/containers/${id}/stop`,
            {
                method: 'POST',
            }
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error('Failed to stop container')
        }
    } catch (error) {
        console.error('Error stopping container:', error)
        throw error
    }
}

export async function startContainer(id: string): Promise<void> {
    console.log('Starting container:', id)
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/containers/${id}/start`,
            {
                method: 'POST',
            }
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error('Failed to start container')
        }
    } catch (error) {
        console.error('Error starting container:', error)
        throw error
    }
}

export async function pauseContainer(id: string): Promise<void> {
    console.log('Pausing container:', id)
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/containers/${id}/pause`,
            {
                method: 'POST',
            }
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error('Failed to pause container')
        }
    } catch (error) {
        console.error('Error pausing container:', error)
        throw error
    }
}

export async function unpauseContainer(id: string): Promise<void> {
    console.log('Unpausing container:', id)
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/containers/${id}/unpause`,
            {
                method: 'POST',
            }
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error('Failed to unpause container')
        }
    } catch (error) {
        console.error('Error unpausing container:', error)
        throw error
    }
}

export async function killContainer(id: string): Promise<void> {
    console.log('Killing container:', id)
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/containers/${id}/kill`,
            {
                method: 'POST',
            }
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error('Failed to kill container')
        }
    } catch (error) {
        console.error('Error killing container:', error)
        throw error
    }
}

export async function startTerminalSession(
    id: string,
    cmd: 'bash' | 'sh',
    user?: string
): Promise<{ Id: string }> {
    console.log('Starting terminal session for container:', id)
    const { currentEndpointId } = useAuthStore.getState()

    const session = {
        'id': id,
        'AttachStdin': true,
        'AttachStdout': true,
        'AttachStderr': true,
        'Tty': true,
        'Cmd': ['sh'],
        ...(user ? { 'User': user } : {}),
    }

    console.log('Session:', JSON.stringify(session, null, 2))

    try {
        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/containers/${id}/exec`,
            {
                method: 'POST',
                body: session,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error('Failed to start terminal session')
        }

        const data = await response.json()

        console.log('data', data)

        return data as { Id: string }
    } catch (error) {
        console.error('Error starting terminal session:', error)
        throw error
    }
}

export async function deleteImage(
    id: string,
    { force = false }: { force?: boolean } = {}
): Promise<void> {
    console.log('Deleting image:', id)
    const { currentEndpointId } = useAuthStore.getState()

    const params = new URLSearchParams({
        force: force.toString(),
    })

    const response = await apiClient(
        `/api/endpoints/${currentEndpointId}/docker/images/${id}?${params.toString()}`,
        {
            method: 'DELETE',
        }
    ).catch((error) => {
        console.error('Error deleting image:', error)
        throw error
    })

    if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
        const errorData = await response.json()
        if (errorData.message && [409, 404].includes(response.respInfo.status)) {
            throw new Error(errorData.message)
        }
        throw new Error('Failed to delete image')
    }
}

export async function deleteVolume(name: string): Promise<void> {
    console.log('Deleting volume:', name)
    const { currentEndpointId } = useAuthStore.getState()

    const response = await apiClient(`/api/endpoints/${currentEndpointId}/docker/volumes/${name}`, {
        method: 'DELETE',
    }).catch((error) => {
        console.error('Error deleting volume:', error)
        throw error
    })

    if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
        const errorData = await response.json()
        if (errorData.message && [409, 404].includes(response.respInfo.status)) {
            throw new Error(errorData.message)
        }
        throw new Error('Failed to delete volume')
    }
}

export async function uploadFile(
    volumeName: string,
    filePath: string,
    file: File,
    localPath: string
) {
    console.log('Uploading file to:', filePath)
    const { currentEndpointId } = useAuthStore.getState()

    const params = new URLSearchParams({
        volumeID: 'letsencrypt_data',
    })

    // in ReactNativeBlobUtil wrapping "FormData" in array is equal to setting a header "Content-Type: multipart/form-data"
    // structure based on /endpoints/{id}/docker/v2/browse/put
    const body = [
        {
            name: 'file',
            filename: file.name,
            type: file.type,
            // todo test in with Android
            data: ReactNativeBlobUtil.wrap(localPath.replace("file://", ""))
        },
        {
            name: 'Path',
            data: filePath
        }
    ]

    const response = await apiClient(
        `/api/endpoints/${currentEndpointId}/docker/v2/browse/put?${params.toString()}`,
        {
            method: 'POST',
            body
        },
        true
    ).catch((error) => {
        console.error('Error uploading file:', error)
        throw error
    })

    console.log('response', response)

    if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
        const errorData = await response.json()
        if (errorData.message && [409, 404].includes(response.respInfo.status)) {
            throw new Error(errorData.message)
        }
        throw new Error('Failed to upload file')
    }
}

export async function deleteFile(volumeId: string, path: string): Promise<void> {
    const { currentEndpointId } = useAuthStore.getState()

    const params = new URLSearchParams({
        path: path,
        volumeID: 'letsencrypt_data',
    })

    const response = await apiClient(
        `/api/endpoints/${currentEndpointId}/docker/v2/browse/delete?${params.toString()}`,
        {
            method: 'DELETE',
        }
    )

    if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
        const errorData = await response.json()
        if (errorData.message) {
            throw new Error(errorData.message)
        }
        throw new Error('Failed to delete file')
    }
}

export async function renameFile(volumeId: string, path: string, newName: string): Promise<void> {
    const { currentEndpointId } = useAuthStore.getState()

    // Get the directory path
    const dirPath = path.split('/').slice(0, -1).join('/') // Get directory path without filename

    // Construct the full paths
    const currentFilePath = path
    const newFilePath = `${dirPath}/${newName}`.replace('//', '/')

    const response = await apiClient(
        `/api/endpoints/${currentEndpointId}/docker/v2/browse/rename?volumeID=${
            // volumeId
            'letsencrypt_data'
        }`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: {
                CurrentFilePath: currentFilePath,
                NewFilePath: newFilePath,
            },
        }
    )

    if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
        const errorData = await response.json()
        if (errorData.message) {
            throw new Error(errorData.message)
        }
        throw new Error('Failed to rename file')
    }
}
