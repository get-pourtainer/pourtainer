import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth'
import type { Container } from '@/types/container'
import type { Endpoint } from '@/types/endpoint'
import type { Image } from '@/types/image'
import type { Network } from '@/types/network'
import type { Status } from '@/types/status'
import type { User } from '@/types/user'
import type { Volume, VolumeEntity } from '@/types/volume'
import WidgetKitModule from '@/widgetkit'

export async function fetchNetworks(): Promise<Network[]> {
    console.log('Fetching NETWORKS from API...')
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const response = await apiClient(`/api/endpoints/${currentEndpointId}/docker/networks`)

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error(`Network response was not ok: ${response.respInfo.status}`)
        }

        const data = await response.json()

        // Sort networks by name
        return (data as Network[]).sort((a, b) => a.Name.localeCompare(b.Name))
    } catch (error) {
        console.error('Error fetching networks:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchVolumes(): Promise<Volume[]> {
    console.log('Fetching VOLUMES from API...')
    const { currentEndpointId } = useAuthStore.getState()
    try {
        // Create URLSearchParams objects for each request
        const danglingParams = new URLSearchParams()
        danglingParams.append('filters', JSON.stringify({ dangling: ['true'] }))

        const activeParams = new URLSearchParams()
        activeParams.append('filters', JSON.stringify({ dangling: ['false'] }))

        const dangling = apiClient(
            `/api/endpoints/${currentEndpointId}/docker/volumes?${danglingParams.toString()}`
        )

        const active = apiClient(
            `/api/endpoints/${currentEndpointId}/docker/volumes?${activeParams.toString()}`
        )

        const [danglingRes, activeRes] = await Promise.all([dangling, active])

        if (
            danglingRes.respInfo.status < 200 ||
            danglingRes.respInfo.status >= 300 ||
            activeRes.respInfo.status < 200 ||
            activeRes.respInfo.status >= 300
        ) {
            throw new Error(
                `Network response was not ok: ${danglingRes.respInfo.status}, ${activeRes.respInfo.status}`
            )
        }

        const danglingData = await danglingRes.json()

        console.log('Dangling data:', danglingData)

        const activeData = await activeRes.json()

        console.log('Active data:', activeData)

        const all = [...(danglingData.Volumes || []), ...(activeData.Volumes || [])]

        // Sort volumes by name
        return (all as Volume[]).sort((a, b) => a.Name.localeCompare(b.Name))
    } catch (error) {
        console.error('Error fetching volumes:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchVolumeContent(name: string, path: string): Promise<VolumeEntity[]> {
    console.log('Fetching VOLUME CONTENT from API...')
    const { currentEndpointId } = useAuthStore.getState()
    try {
        const params = new URLSearchParams({
            path: path,
            volumeID: name,
        })

        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/v2/browse/ls?${params.toString()}`
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error(`Network response was not ok: ${response.respInfo.status}`)
        }

        const data = await response.json()

        return data as VolumeEntity[]
    } catch (error) {
        console.log('Error fetching volume content:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchImages(): Promise<Image[]> {
    console.log('Fetching IMAGES from API...')
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const response = await apiClient(`/api/docker/${currentEndpointId}/images?withUsage=true`)

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error(`Network response was not ok: ${response.respInfo.status}`)
        }

        const data = await response.json()

        return data as Image[]
    } catch (error) {
        console.error('Error fetching images:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchContainers(): Promise<Container[]> {
    console.log('Fetching CONTAINERS from API...')
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const params = new URLSearchParams({
            all: 'true',
        })

        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/containers/json?${params.toString()}`
        )

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error(`Network response was not ok: ${response.respInfo.status}`)
        }

        const data = await response.json()

        // Sort containers by their first name (removing leading slash)
        const sortedContainers = (data as Container[]).sort((a, b) => {
            const nameA = a.Names[0].replace(/^\//, '')
            const nameB = b.Names[0].replace(/^\//, '')
            return nameA.localeCompare(nameB)
        })

        WidgetKitModule.registerContainers(sortedContainers.map(container => ({
            id: container.Id,
            name: container.Names.at(0) ?? "Unnamed"
        })))

        return sortedContainers
    } catch (error) {
        console.error('Error fetching applications:', error)
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
    const { currentEndpointId } = useAuthStore.getState()

    try {
        const params = new URLSearchParams({
            since: options.since.toString(),
            stderr: '1',
            stdout: '1',
            tail: options.tail.toString(),
            timestamps: options.timestamps ? '1' : '0',
        })

        const response = await apiClient(
            `/api/endpoints/${currentEndpointId}/docker/containers/${id}/logs?${params.toString()}`,
            {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                },
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

        console.log('result', result)

        return result
    } catch (error) {
        console.error('Error fetching logs:', error)
        throw error
    }
}

export async function fetchMe(): Promise<User> {
    console.log('Fetching current user from API...')

    try {
        const response = await apiClient('/api/users/me')

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error(`Network response was not ok: ${response.respInfo.status}`)
        }

        const data = await response.json()
        return data as User
    } catch (error) {
        console.error('Error fetching current user:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchStatus(): Promise<Status> {
    console.log('Fetching system status from API...')

    try {
        const response = await apiClient('/api/system/status')

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error(`Network response was not ok: ${response.respInfo.status}`)
        }

        const data = await response.json()
        return data as Status
    } catch (error) {
        console.error('Error fetching system status:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}

export async function fetchEndpoints(): Promise<Endpoint[]> {
    console.log('Fetching endpoints from API...')

    try {
        const params = new URLSearchParams({
            excludeSnapshots: 'true',
        })

        const response = await apiClient(`/api/endpoints?${params.toString()}`)

        if (response.respInfo.status < 200 || response.respInfo.status >= 300) {
            throw new Error(`Network response was not ok: ${response.respInfo.status}`)
        }

        const data = await response.json()
        return data as Endpoint[]
    } catch (error) {
        console.error('Error fetching endpoints:', error)
        console.log(JSON.stringify(error, null, 2))
        throw error
    }
}
