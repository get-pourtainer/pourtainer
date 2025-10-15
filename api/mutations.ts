import dockerClient from '@/lib/docker'
import type { components } from '@/lib/docker/schema'
import portainerClient from '@/lib/portainer'
import { usePersistedStore } from '@/stores/persisted'
import ReactNativeBlobUtil from 'react-native-blob-util'

export async function restartContainer(id: string): Promise<void> {
    console.log('Restarting container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/restart', {
            params: {
                path: {
                    id,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error restarting container:', error)
        throw error
    }
}

export async function stopContainer(id: string): Promise<void> {
    console.log('Stopping container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/stop', {
            params: {
                path: {
                    id,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error stopping container:', error)
        throw error
    }
}

export async function startContainer(id: string): Promise<void> {
    console.log('Starting container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/start', {
            params: {
                path: {
                    id,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error starting container:', error)
        throw error
    }
}

export async function pauseContainer(id: string): Promise<void> {
    console.log('Pausing container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/pause', {
            params: {
                path: {
                    id,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error pausing container:', error)
        throw error
    }
}

export async function unpauseContainer(id: string): Promise<void> {
    console.log('Unpausing container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/unpause', {
            params: {
                path: {
                    id,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error unpausing container:', error)
        throw error
    }
}

export async function killContainer(id: string): Promise<void> {
    console.log('Killing container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/kill', {
            params: {
                path: {
                    id,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
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
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/exec', {
            params: {
                path: {
                    id,
                },
            },
            body: {
                'id': id,
                'AttachStdin': true,
                'AttachStdout': true,
                'AttachStderr': true,
                'Tty': true,
                'Cmd': [cmd],
                ...(user ? { 'User': user } : {}),
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }

        return response.data
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
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).DELETE('/images/{name}', {
            params: {
                path: {
                    name: id,
                },
                query: {
                    force: force,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error deleting image:', error)
        throw error
    }
}

export async function deleteVolume(name: string): Promise<void> {
    console.log('Deleting volume:', name)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).DELETE('/volumes/{name}', {
            params: {
                path: {
                    name,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error deleting volume:', error)
        throw error
    }
}

export async function uploadFile(
    volumeId: string,
    filePath: string,
    file: File,
    localPath: string
) {
    console.log('Uploading file to:', filePath)
    const currentConnection = usePersistedStore.getState().currentConnection

    // in ReactNativeBlobUtil wrapping "FormData" in array is equal to setting a header "Content-Type: multipart/form-data"
    const body = [
        {
            name: 'file',
            filename: file.name,
            type: file.type,
            // todo test in with Android
            data: ReactNativeBlobUtil.wrap(localPath.replace('file://', '')),
        },
        {
            name: 'Path',
            data: filePath,
        },
    ]

    const response = await portainerClient().POST('/endpoints/{id}/docker/v2/browse/put', {
        params: {
            path: {
                id: Number(currentConnection?.currentEndpointId!),
            },
            query: {
                volumeID: volumeId,
            },
        },
        body: body as any,
    })

    if (response.error) {
        // @ts-ignore
        throw new Error(response.error.message)
    }
}

export async function deleteFile(volumeId: string, path: string): Promise<void> {
    const currentConnection = usePersistedStore.getState().currentConnection
    try {
        const response = await portainerClient().DELETE('/endpoints/{id}/docker/v2/browse/delete', {
            params: {
                path: {
                    id: Number(currentConnection?.currentEndpointId!),
                },
                query: {
                    path: path,
                    volumeID: volumeId,
                },
            },
        })

        if (response.error) {
            // @ts-ignore
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error deleting file:', error)
        throw error
    }
}

export async function renameFile(volumeId: string, path: string, newName: string): Promise<void> {
    const currentConnection = usePersistedStore.getState().currentConnection

    // Get the directory path
    const dirPath = path.split('/').slice(0, -1).join('/') // Get directory path without filename

    // Construct the full paths
    const currentFilePath = path
    const newFilePath = `${dirPath}/${newName}`.replace('//', '/')

    try {
        const response = await portainerClient().PUT('/endpoints/{id}/docker/v2/browse/rename', {
            params: {
                path: {
                    id: Number(currentConnection?.currentEndpointId!),
                },
                query: {
                    volumeID: volumeId,
                },
            },
            body: {
                CurrentFilePath: currentFilePath,
                NewFilePath: newFilePath,
            },
        })

        if (response.error) {
            // @ts-ignore
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error renaming file:', error)
        throw error
    }
}

export async function backupConfig(password?: string) {
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await ReactNativeBlobUtil.config({
            trusty: true,
        }).fetch(
            'POST',
            `${currentConnection?.baseUrl}/api/backup`,
            {
                'x-api-key': currentConnection?.apiToken!,
            },
            JSON.stringify({
                password: password || '',
            })
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error(`Network response was not ok: ${response.respInfo.status}`)
        }

        const data = await response.base64()

        return data
    } catch (error) {
        console.error('Error backing up config:', error)
        throw error
    }
}

export async function pullImage(imageName: string) {
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/images/create', {
            params: {
                query: {
                    fromImage: imageName,
                },
            },
        })

        if (response.error) {
            throw new Error(response.error.message)
        }
    } catch (error) {
        console.error('Error pulling image:', error)
        throw error
    }
}

export async function updateContainer(
    input: components['schemas']['ContainerConfig'] & {
        HostConfig: components['schemas']['HostConfig']
        NetworkingConfig: components['schemas']['NetworkingConfig']
    },
    extraData: {
        id: string
        name: string
    }
) {
    console.log('Creating container:', JSON.stringify(input, null, 2))
    const currentConnection = usePersistedStore.getState().currentConnection

    const { id, name } = extraData

    try {
        // rename current container to "name-old"
        // create new container with new name
        // start new container
        // delete old container

        const stopResponse = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/stop', {
            params: {
                path: {
                    id,
                },
            },
        })

        if (stopResponse.error) {
            throw new Error(stopResponse.error.message)
        }

        const renameResponse = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/rename', {
            params: {
                path: {
                    id,
                },
                query: {
                    'name': `${name}-old`,
                },
            },
        })

        if (renameResponse.error) {
            throw new Error(renameResponse.error.message)
        }

        const bodyData = {
            ...input,
            Name: undefined,
            Id: undefined,
        }

        const createResponse = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/create', {
            params: {
                query: {
                    name,
                },
            },
            body: bodyData,
        })

        if (createResponse.error) {
            // try to rename old container back to original name
            await dockerClient({
                connectionId: currentConnection?.id,
                endpointId: currentConnection?.currentEndpointId!,
            }).POST('/containers/{id}/rename', {
                params: {
                    path: {
                        id,
                    },
                    query: {
                        'name': name,
                    },
                },
            })

            // try to start old container
            await dockerClient({
                connectionId: currentConnection?.id,
                endpointId: currentConnection?.currentEndpointId!,
            }).POST('/containers/{id}/start', {
                params: {
                    path: {
                        id,
                    },
                },
            })

            throw new Error(createResponse.error.message)
        }

        if (!createResponse.data) {
            throw new Error('Failed to create updated container')
        }

        const startResponse = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/start', {
            params: {
                path: {
                    id: createResponse.data.Id,
                },
            },
        })

        console.log('startResponse', startResponse)

        const deleteResponse = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).DELETE('/containers/{id}', {
            params: {
                path: {
                    id,
                },
            },
        })

        console.log('deleteResponse', deleteResponse)

        return createResponse.data
    } catch (error) {
        console.error('Error creating container:', error)
        throw error
    }
}
