import dockerClient from '@/lib/docker'
import portainerClient from '@/lib/portainer'
import { usePersistedStore } from '@/stores/persisted'
import ReactNativeBlobUtil from 'react-native-blob-util'

export async function fetchNetworks() {
    console.log('Fetching NETWORKS from API...')
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const response = await dockerClient({
            connectionId: currentConnection?.id,
            endpointId: currentConnection?.currentEndpointId!,
        }).GET('/networks')

        if (response.error) {
            throw new Error(response.error.message)
        }

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

        if (danglingRes.error) {
            throw new Error(danglingRes.error.message)
        }

        if (activeRes.error) {
            throw new Error(activeRes.error.message)
        }

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
        const response = await portainerClient().GET('/endpoints/{id}/docker/v2/browse/ls', {
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

        return response.data
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
        // todo remove me sometime in the future
        // register instance for users who were already signed in
        // if (WidgetKitModule.getConnections().length === 0) {
        //     if (currentConnection) {
        //         WidgetKitModule.registerConnection({
        //             id: currentConnection.id,
        //             url: currentConnection.baseUrl,
        //             accessToken: currentConnection.apiToken,
        //         })
        //     }
        // }

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

        if (response.error) {
            throw new Error(response.error.message)
        }

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

        if (response.error) {
            throw new Error(response.error.message)
        }

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
        since: number
    }
): Promise<string> {
    console.log('Fetching logs for container:', id, options)
    const currentConnection = usePersistedStore.getState().currentConnection

    try {
        const params = new URLSearchParams({
            since: options.since.toString(),
            stderr: '1',
            stdout: '1',
            tail: options.tail.toString(),
            timestamps: options.timestamps ? '1' : '0',
        })

        const response = await ReactNativeBlobUtil.config({
            trusty: true,
        }).fetch(
            'GET',
            `${currentConnection?.baseUrl}/api/endpoints/${currentConnection?.currentEndpointId}/docker/containers/${id}/logs?${params.toString()}`,
            {
                'x-api-key': currentConnection?.apiToken!,
                'Accept': 'application/json, text/plain, */*',
            }
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error(`Network response was not ok: ${response.respInfo.status}`)
        }

        // Get the raw data as base64
        const base64Data = await response.base64()

        // Convert base64 to Uint8Array
        const binaryString = atob(base64Data)
        const uint8Array = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i)
        }

        let result = ''
        let position = 0

        // Process the multiplexed stream format
        while (position < uint8Array.length) {
            // Skip the header (1 byte for stream type + 3 null bytes)
            position += 4

            // Read the message length (4 bytes, big-endian)
            const length =
                (uint8Array[position] << 24) +
                (uint8Array[position + 1] << 16) +
                (uint8Array[position + 2] << 8) +
                uint8Array[position + 3]
            position += 4

            // Convert the message bytes to string
            const message = new TextDecoder().decode(uint8Array.slice(position, position + length))
            result += message

            position += length
        }

        return result
    } catch (error) {
        console.error('Error fetching logs:', error)
        throw error
    }
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

export async function fetchStatus() {
    console.log('Fetching system status from API...')

    try {
        const response = await portainerClient().GET('/system/status')

        if (!response.data) {
            throw new Error('No data returned from API')
        }

        return response.data
    } catch (error) {
        console.error('Error fetching system status:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
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
