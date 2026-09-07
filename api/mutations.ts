import { fetchStack, fetchStackFile } from '@/api/queries'
import dockerClient from '@/lib/docker'
import { splitImageReference } from '@/lib/docker/image'
import type { components } from '@/lib/docker/schema'
import portainerClient from '@/lib/portainer'
import {
    ACCESS_DENIED_CONTAINER,
    ACCESS_DENIED_VOLUME,
    ApiError,
    assertBlobOk,
} from '@/lib/portainer/errors'
import { usePersistedStore } from '@/stores/persisted'
import ReactNativeBlobUtil from 'react-native-blob-util'

export async function restartContainer(id: string): Promise<void> {
    console.log('Restarting container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/restart', {
            params: {
                path: {
                    id,
                },
            },
        })
    } catch (error) {
        console.error('Error restarting container:', error)
        throw error
    }
}

export async function stopContainer(id: string): Promise<void> {
    console.log('Stopping container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/stop', {
            params: {
                path: {
                    id,
                },
            },
        })
    } catch (error) {
        console.error('Error stopping container:', error)
        throw error
    }
}

export async function startContainer(id: string): Promise<void> {
    console.log('Starting container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
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
    } catch (error) {
        console.error('Error starting container:', error)
        throw error
    }
}

export async function pauseContainer(id: string): Promise<void> {
    console.log('Pausing container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/pause', {
            params: {
                path: {
                    id,
                },
            },
        })
    } catch (error) {
        console.error('Error pausing container:', error)
        throw error
    }
}

export async function unpauseContainer(id: string): Promise<void> {
    console.log('Unpausing container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/unpause', {
            params: {
                path: {
                    id,
                },
            },
        })
    } catch (error) {
        console.error('Error unpausing container:', error)
        throw error
    }
}

export async function killContainer(id: string): Promise<void> {
    console.log('Killing container:', id)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).POST('/containers/{id}/kill', {
            params: {
                path: {
                    id,
                },
            },
        })
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
            accessDenied: ACCESS_DENIED_CONTAINER,
        }).POST('/containers/{id}/exec', {
            params: {
                path: {
                    id,
                },
            },
            body: {
                'AttachStdin': true,
                'AttachStdout': true,
                'AttachStderr': true,
                'Tty': true,
                'Cmd': [cmd],
                ...(user ? { 'User': user } : {}),
            },
        })

        if (!response.data) {
            throw new Error('Failed to start terminal session')
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
        await dockerClient({
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
    } catch (error) {
        console.error('Error deleting image:', error)
        throw error
    }
}

export async function deleteVolume(name: string): Promise<void> {
    console.log('Deleting volume:', name)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).DELETE('/volumes/{name}', {
            params: {
                path: {
                    name,
                },
            },
        })
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
            data: ReactNativeBlobUtil.wrap(localPath.replace('file://', '')),
        },
        {
            name: 'Path',
            data: filePath,
        },
    ]

    await portainerClient({ accessDenied: ACCESS_DENIED_VOLUME }).POST(
        '/endpoints/{id}/docker/v2/browse/put',
        {
            params: {
                path: {
                    id: Number(currentConnection?.currentEndpointId!),
                },
                query: {
                    volumeID: volumeId,
                },
            },
            body: body as any,
        }
    )
}

export async function deleteFile(volumeId: string, path: string): Promise<void> {
    const currentConnection = usePersistedStore.getState().currentConnection
    try {
        await portainerClient({ accessDenied: ACCESS_DENIED_VOLUME }).DELETE(
            '/endpoints/{id}/docker/v2/browse/delete',
            {
                params: {
                    path: {
                        id: Number(currentConnection?.currentEndpointId!),
                    },
                    query: {
                        path: path,
                        volumeID: volumeId,
                    },
                },
            }
        )
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
        await portainerClient({ accessDenied: ACCESS_DENIED_VOLUME }).PUT(
            '/endpoints/{id}/docker/v2/browse/rename',
            {
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
            }
        )
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

        assertBlobOk(response, 'Failed to back up')

        const data = await response.base64()

        return data
    } catch (error) {
        console.error('Error backing up config:', error)
        throw error
    }
}

export async function pullImage(imageName: string): Promise<void> {
    const currentConnection = usePersistedStore.getState().currentConnection
    if (!currentConnection) {
        throw new Error('No connection found')
    }

    const { fromImage, tag } = splitImageReference(imageName)
    const params = new URLSearchParams({ fromImage, ...(tag ? { tag } : {}) })
    const url = `${currentConnection.baseUrl}/api/endpoints/${currentConnection.currentEndpointId}/docker/images/create?${params}`

    // Requested directly: the response is an NDJSON progress stream, and
    // Docker reports some pull failures inside it with HTTP 200
    const response = await ReactNativeBlobUtil.config({ trusty: true }).fetch('POST', url, {
        'x-api-key': currentConnection.apiToken,
    })

    assertBlobOk(response, 'Failed to pull image')

    const streamError = findPullError(typeof response.data === 'string' ? response.data : '')
    if (streamError) {
        throw new ApiError(streamError.message, response.respInfo.status, streamError.details)
    }
}

// An {"error": ...} event inside the progress stream, normally the last line
// of thousands for a multi-layer pull, so only candidate lines are parsed.
function findPullError(stream: string): { message: string; details?: string } | null {
    if (!stream.includes('"error"')) return null

    for (const line of stream.split('\n').reverse()) {
        if (!line.includes('"error"')) continue
        try {
            const event = JSON.parse(line) as { error?: string; errorDetail?: { message?: string } }
            if (event.error) {
                return { message: event.error, details: event.errorDetail?.message }
            }
        } catch {}
    }

    return null
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
): Promise<{ Id: string; warnings: string[] }> {
    const currentConnection = usePersistedStore.getState().currentConnection
    const { id, name } = extraData
    const oldName = `${name}-old`

    const client = dockerClient({
        connectionId: currentConnection?.id,
        endpointId: currentConnection?.currentEndpointId!,
    })

    // Recreate flow: (stop) -> rename old -> create new -> start new -> delete old.
    // Every step after the rename rolls back to the original container.
    const inspect = await client.GET('/containers/{id}/json', { params: { path: { id } } })
    const wasRunning = inspect.data?.State?.Running === true

    if (wasRunning) {
        await client.POST('/containers/{id}/stop', { params: { path: { id } } })
    }

    await client.POST('/containers/{id}/rename', {
        params: { path: { id }, query: { name: oldName } },
    })

    // Best effort: give the original container its name (and state) back
    const restoreOriginal = async () => {
        try {
            await client.POST('/containers/{id}/rename', {
                params: { path: { id }, query: { name } },
            })
            if (wasRunning) {
                await client.POST('/containers/{id}/start', { params: { path: { id } } })
            }
        } catch (error) {
            console.error('Could not restore the original container:', error)
        }
    }

    let newId: string
    const warnings: string[] = []

    try {
        const created = await client.POST('/containers/create', {
            params: { query: { name } },
            body: { ...input, Name: undefined, Id: undefined },
        })
        if (!created.data) {
            throw new ApiError('Failed to create updated container', created.response.status)
        }
        newId = created.data.Id
        warnings.push(...(created.data.Warnings ?? []))
    } catch (error) {
        await restoreOriginal()
        throw error
    }

    try {
        await client.POST('/containers/{id}/start', { params: { path: { id: newId } } })
    } catch (error) {
        await client
            .DELETE('/containers/{id}', { params: { path: { id: newId }, query: { force: true } } })
            .catch(() => {})
        await restoreOriginal()
        const cause = error instanceof ApiError ? error : new ApiError(String(error), 0)
        throw new ApiError(
            `The updated container could not start: ${cause.message}`,
            cause.status,
            cause.details
        )
    }

    try {
        await client.DELETE('/containers/{id}', { params: { path: { id } } })
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        warnings.push(`The old container "${oldName}" could not be removed: ${reason}`)
    }

    return { Id: newId, warnings }
}

export async function updateStackFile(
    stackId: number,
    stackFileContent: string,
    options: {
        env?: Array<{ name: string; value: string }>
        prune?: boolean
        pullImage?: boolean
    } = {}
): Promise<void> {
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        // Portainer replaces the stack's variables with whatever is sent, so an
        // omitted env must be the server's current one, never an empty list.
        const env = options.env ?? (await fetchStack(stackId)).Env ?? []

        await portainerClient().PUT('/stacks/{id}', {
            params: {
                path: {
                    id: stackId,
                },
                query: {
                    endpointId: Number(currentConnection?.currentEndpointId!),
                },
            },
            body: {
                StackFileContent: stackFileContent,
                Env: env,
                Prune: options.prune ?? false,
                // PullImage is deprecated since Portainer 2.36 in favour of
                // RepullImageAndRedeploy; sending both works on every version.
                PullImage: options.pullImage ?? false,
                RepullImageAndRedeploy: options.pullImage ?? false,
            },
        })
    } catch (error) {
        console.error('Error updating stack file:', error)
        throw error
    }
}

export async function updateStackEnv(
    stackId: number,
    env: Array<{ name: string; value: string }>
): Promise<void> {
    const file = await fetchStackFile(stackId)

    if (!file?.StackFileContent) {
        throw new Error('Could not read the current stack file')
    }

    await updateStackFile(stackId, file.StackFileContent, { env })
}
