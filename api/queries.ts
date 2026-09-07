import dockerClient from '@/lib/docker'
import { decodeDockerLogs } from '@/lib/docker/logs'
import portainerClient from '@/lib/portainer'
import { ACCESS_DENIED_VOLUME, assertBlobOk } from '@/lib/portainer/errors'
import { usePersistedStore } from '@/stores/persisted'
import type { Image } from '@/types/image'
import ReactNativeBlobUtil from 'react-native-blob-util'
import stripAnsi from 'strip-ansi'

export async function fetchNetworks() {
    console.log('Fetching NETWORKS from API...')
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).GET('/networks')

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        const data = response.data

        // Sort networks by name
        return data
            .filter((network) => network.Name !== undefined)
            .sort((a, b) => a.Name!.localeCompare(b.Name!))
    } catch (error) {
        console.error('Error fetching networks:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchVolumes() {
    console.log('Fetching VOLUMES from API...')
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const dangling = dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).GET('/volumes', {
            params: {
                query: {
                    filters: JSON.stringify({ dangling: ['true'] }),
                },
            },
        })

        const active = dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).GET('/volumes', {
            params: {
                query: {
                    filters: JSON.stringify({ dangling: ['false'] }),
                },
            },
        })

        const [danglingRes, activeRes] = await Promise.all([dangling, active])

        const danglingData = danglingRes.data
        const activeData = activeRes.data

        console.log('Dangling data:', danglingData)
        console.log('Active data:', activeData)

        const all = [...(danglingData?.Volumes || []), ...(activeData?.Volumes || [])]

        // Sort volumes by name
        return all.sort((a, b) => a.Name.localeCompare(b.Name))
    } catch (error) {
        console.error('Error fetching volumes:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchVolumeContent(name: string, path: string) {
    console.log('Fetching VOLUME CONTENT from API...')
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await portainerClient({
            accessDenied: ACCESS_DENIED_VOLUME,
        }).GET('/endpoints/{id}/docker/v2/browse/ls', {
            params: {
                path: {
                    id: Number(currentConnection?.currentEndpointId!),
                },
                query: {
                    path: path,
                    volumeID: name,
                },
            },
        })

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        return response.data
    } catch (error) {
        console.log('Error fetching volume content:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchImages() {
    console.log('Fetching IMAGES from API...')
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await portainerClient({
            connectionId: currentConnection?.id,
        }).GET('/docker/{environmentId}/images', {
            params: {
                path: {
                    environmentId: Number(currentConnection?.currentEndpointId!),
                },
                query: {
                    withUsage: true,
                },
            },
        })

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        // Fields are optional in the Portainer API document; keep the UI type strict.
        return response.data.flatMap((image): Image[] =>
            image.id
                ? [
                      {
                          id: image.id,
                          created: image.created ?? 0,
                          nodeName: image.nodeName ?? '',
                          size: image.size ?? 0,
                          tags: image.tags ?? [],
                          used: image.used ?? true,
                      },
                  ]
                : []
        )
    } catch (error) {
        console.error('Error fetching images:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchContainers() {
    console.log('Fetching CONTAINERS from API...')
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).GET('/containers/json', {
            params: {
                query: {
                    all: true,
                },
            },
        })

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        const data = response.data

        // Sort containers by their first name (removing leading slash)
        return data.sort((a, b) => {
            const nameA = a.Names?.[0]?.replace(/^\//, '') || ''
            const nameB = b.Names?.[0]?.replace(/^\//, '') || ''
            return nameA.localeCompare(nameB)
        })
    } catch (error) {
        console.error('Error fetching containers:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchContainer(id: string) {
    console.log('Fetching CONTAINER from API...')
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).GET('/containers/{id}/json', {
            params: {
                path: {
                    id: id,
                },
            },
        })

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        return response.data
    } catch (error) {
        console.error('Error fetching container:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchLogs(
    id: string,
    options: {
        timestamps: boolean
        tail: number
        // Rolling window in seconds; 0 means everything. Docker's own `since`
        // is an absolute UNIX timestamp, computed here on every call.
        sinceSeconds: number
    }
): Promise<string> {
    const currentConnection = usePersistedStore.getState().currentConnection
    if (!currentConnection) {
        throw new Error('No connection found')
    }

    const since =
        options.sinceSeconds > 0 ? Math.floor(Date.now() / 1000) - options.sinceSeconds : 0

    const params = new URLSearchParams({
        since: since.toString(),
        stderr: '1',
        stdout: '1',
        tail: options.tail.toString(),
        timestamps: options.timestamps ? '1' : '0',
    })

    const response = await ReactNativeBlobUtil.config({ trusty: true }).fetch(
        'GET',
        `${currentConnection.baseUrl}/api/endpoints/${currentConnection.currentEndpointId}/docker/containers/${id}/logs?${params.toString()}`,
        {
            'x-api-key': currentConnection.apiToken,
            Accept: '*/*',
        }
    )

    // A failure body is JSON text even though logs themselves are binary
    assertBlobOk(response, 'Failed to fetch logs')

    const binaryString = atob(await response.base64())
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    const headers = response.respInfo.headers as Record<string, string | undefined>
    const contentType = headers['Content-Type'] ?? headers['content-type']

    return stripAnsi(decodeDockerLogs(bytes, contentType))
}

export async function fetchMe() {
    console.log('Fetching current user from API...')

    try {
        const response = await portainerClient().GET('/users/me')

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        return response.data
    } catch (error) {
        console.error('Error fetching current user:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchSystemStatus({ connectionId }: { connectionId?: string } = {}) {
    const response = await portainerClient({ connectionId }).GET('/system/status')

    if (!response.data) {
        throw new Error('No data returned from API')
    }

    return response.data
}

export async function fetchEndpoints({ connectionId }: { connectionId?: string } = {}) {
    console.log('Fetching endpoints from API...')

    try {
        const response = await portainerClient({
            connectionId: connectionId,
        }).GET('/endpoints', {
            params: {
                query: {
                    excludeSnapshots: true,
                },
            },
        })

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        return response.data
    } catch (error) {
        console.error('Error fetching endpoints:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchStacks() {
    console.log('Fetching stacks from API...')
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        // First try without filters to see if the endpoint works
        const response = await portainerClient().GET('/stacks')

        // Handle 204 (no content) or empty array responses
        const allStacks = response.data || []

        // Filter by current endpoint if we have stacks
        if (currentConnection?.currentEndpointId && Array.isArray(allStacks)) {
            return allStacks.filter(
                (stack) => stack.EndpointId === Number(currentConnection.currentEndpointId)
            )
        }

        return allStacks
    } catch (error) {
        console.error('Error fetching stacks:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchStack(stackId: number) {
    console.log('Fetching stack from API...', stackId)

    try {
        const response = await portainerClient().GET('/stacks/{id}', {
            params: {
                path: {
                    id: stackId,
                },
            },
        })

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        return response.data
    } catch (error) {
        console.error('Error fetching stack:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchStackFile(stackId: number) {
    console.log('Fetching stack file from API...', stackId)

    try {
        const response = await portainerClient().GET('/stacks/{id}/file', {
            params: {
                path: {
                    id: stackId,
                },
            },
        })

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        return response.data
    } catch (error) {
        console.error('Error fetching stack file:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}
