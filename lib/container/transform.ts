import type { components } from '@/lib/docker/schema'

// Extract types from schema instead of redeclaring them
export type LoggingDriver = NonNullable<
    NonNullable<components['schemas']['HostConfig']['LogConfig']>['Type']
>
export type RestartPolicy = NonNullable<components['schemas']['RestartPolicy']['Name']>
export type ConsoleMode = 'interactive-tty' | 'tty' | 'interactive' | 'none'

// UI-friendly form types
export interface ContainerEditForm {
    basic: {
        name: string
        image: string
        logging: LoggingDriver
        restartPolicy: RestartPolicy
    }
    ports: PortMapping[]
    commands: {
        command: string[]
        entrypoint: string[]
        workingDir: string
        user: string
        console: ConsoleMode
    }
    env: KeyValuePair[]
    labels: KeyValuePair[]
    volumes: VolumeMapping[]
    // Raw/passthrough data for properties we don't expose in UI
    raw: {
        containerConfig: Partial<components['schemas']['ContainerConfig']>
        hostConfig: Partial<components['schemas']['HostConfig']>
        networkingConfig: components['schemas']['NetworkingConfig']
    }
}

export interface PortMapping {
    hostPort: string
    containerPort: string
    protocol: 'tcp' | 'udp'
}

export interface KeyValuePair {
    key: string
    value: string
}

export interface VolumeMapping {
    containerPath: string
    hostPath: string
    type: 'volume' | 'bind'
    readOnly: boolean
}

type ContainerInspectResponse = components['schemas']['ContainerInspectResponse']
type ContainerCreateRequest = components['schemas']['ContainerConfig'] & {
    HostConfig: components['schemas']['HostConfig']
    NetworkingConfig: components['schemas']['NetworkingConfig']
}

export function inspectResponseToEditForm(container: ContainerInspectResponse): ContainerEditForm {
    // Fixed: Properly type the config and hostConfig with proper fallbacks
    const config = container.Config as components['schemas']['ContainerConfig'] | undefined
    const hostConfig = container.HostConfig as components['schemas']['HostConfig'] | undefined

    // Fixed: Handle restart policy correctly - map all valid schema values
    const restartPolicy: RestartPolicy =
        hostConfig?.RestartPolicy?.Name === 'always'
            ? 'always'
            : hostConfig?.RestartPolicy?.Name === 'on-failure'
              ? 'on-failure'
              : hostConfig?.RestartPolicy?.Name === 'unless-stopped'
                ? 'unless-stopped'
                : hostConfig?.RestartPolicy?.Name === 'no'
                  ? 'no'
                  : '' // Default to empty string (None)

    // Convert console mode
    const console: ConsoleMode =
        config?.AttachStdin && config?.Tty
            ? 'interactive-tty'
            : config?.Tty
              ? 'tty'
              : config?.AttachStdin
                ? 'interactive'
                : 'none'

    // Fixed: Handle port bindings correctly
    const ports: PortMapping[] = []
    if (hostConfig?.PortBindings) {
        for (const [containerPortProto, bindings] of Object.entries(hostConfig.PortBindings)) {
            const [containerPort, protocol] = containerPortProto.split('/')
            // Fixed: Handle the fact that bindings can be null and has correct PortBinding structure
            if (Array.isArray(bindings)) {
                for (const binding of bindings) {
                    if (binding?.HostPort) {
                        ports.push({
                            hostPort: binding.HostPort,
                            containerPort,
                            protocol: protocol as 'tcp' | 'udp',
                        })
                    }
                }
            }
        }
    }

    // Convert environment variables
    const env: KeyValuePair[] = (config?.Env || []).map((envVar: string) => {
        const [key, ...valueParts] = envVar.split('=')
        return { key, value: valueParts.join('=') }
    })

    // Convert labels - Fixed: Properly handle the Labels type
    const labels: KeyValuePair[] = Object.entries(config?.Labels || {}).map(([key, value]) => ({
        key,
        value: String(value), // Fixed: Ensure value is a string
    }))

    // Convert volumes/mounts
    const volumes: VolumeMapping[] = (container.Mounts || []).map((mount) => ({
        containerPath: mount.Destination || '',
        hostPath: mount.Type === 'volume' ? mount.Name || '' : mount.Source || '',
        type: mount.Type === 'volume' ? 'volume' : mount.Type === 'bind' ? 'bind' : 'bind', // fallback for other types
        readOnly: mount.RW === false,
    }))

    // Convert NetworkSettings to NetworkingConfig format
    const networkingConfig: components['schemas']['NetworkingConfig'] = {
        EndpointsConfig: container.NetworkSettings?.Networks || {},
    }

    // Preserve unmapped ContainerConfig properties using destructuring
    const {
        Cmd,
        Entrypoint,
        Env,
        Image,
        Labels,
        WorkingDir,
        User,
        AttachStdin,
        AttachStdout,
        AttachStderr,
        Tty,
        OpenStdin,
        StdinOnce,
        ...preservedContainerConfig
    } = config || {}

    // Preserve unmapped HostConfig properties using destructuring
    const { RestartPolicy, PortBindings, Binds, LogConfig, Memory, ...preservedHostConfig } =
        hostConfig || {}

    return {
        basic: {
            name: container.Name?.replace(/^\//, '') || '', // Remove leading slash
            image: config?.Image || '',
            logging: (hostConfig?.LogConfig?.Type as LoggingDriver) || 'json-file',
            restartPolicy,
        },
        ports,
        commands: {
            command: config?.Cmd || [],
            entrypoint: config?.Entrypoint || [],
            workingDir: config?.WorkingDir || '',
            user: config?.User || '',
            console,
        },
        env,
        labels,
        volumes,
        raw: {
            containerConfig: preservedContainerConfig || {},
            hostConfig: preservedHostConfig || {},
            networkingConfig,
        },
    }
}

export function editFormToCreateRequest(form: ContainerEditForm): ContainerCreateRequest {
    // Fixed: Handle restart policy correctly with proper types - use values directly
    const restartPolicy: components['schemas']['RestartPolicy'] = {
        Name: form.basic.restartPolicy, // Use the value directly, no conversion needed
        MaximumRetryCount: form.basic.restartPolicy === 'on-failure' ? 0 : undefined,
    }

    // Convert console settings
    const attachStdin = form.commands.console.includes('interactive')
    const tty = form.commands.console.includes('tty')

    // Fixed: Handle port bindings with correct PortBinding structure
    const portBindings: components['schemas']['PortMap'] = {}
    for (const port of form.ports) {
        const key = `${port.containerPort}/${port.protocol}`
        // Fixed: Use proper PortBinding structure
        portBindings[key] = [
            {
                HostPort: port.hostPort,
                HostIp: undefined, // Optional field, can be undefined
            },
        ]
    }

    // Convert environment variables
    const env = form.env
        .filter(({ key }) => key.trim() !== '') // Filter out empty keys
        .map(({ key, value }) => `${key}=${value}`)

    // Convert labels
    const labels: Record<string, string> = {}
    for (const { key, value } of form.labels.filter(({ key }) => key.trim() !== '')) {
        labels[key] = value
    }

    // Convert volumes
    const binds = form.volumes
        .filter(
            (vol) =>
                vol.type === 'bind' && vol.containerPath.trim() !== '' && vol.hostPath.trim() !== ''
        )
        .map((vol) => `${vol.hostPath}:${vol.containerPath}${vol.readOnly ? ':ro' : ''}`)

    return {
        // Container Config - merge UI values with preserved raw data
        ...form.raw.containerConfig,
        Image: form.basic.image,
        Cmd: form.commands.command.length > 0 ? form.commands.command : undefined,
        Entrypoint: form.commands.entrypoint.length > 0 ? form.commands.entrypoint : undefined,
        WorkingDir: form.commands.workingDir || undefined,
        User: form.commands.user || undefined,
        Env: env.length > 0 ? env : undefined,
        Labels: Object.keys(labels).length > 0 ? labels : undefined,
        AttachStdin: attachStdin,
        AttachStdout: true,
        AttachStderr: true,
        Tty: tty,
        OpenStdin: attachStdin,
        StdinOnce: false,
        ArgsEscaped: null,
        NetworkDisabled: null,
        MacAddress: null,
        OnBuild: null,

        // Fixed: HostConfig with required Memory field from Resources - merge UI values with preserved raw data
        HostConfig: {
            ...form.raw.hostConfig,
            // Required field from Resources
            Memory: form.raw.hostConfig.Memory ?? 0,

            // Fields from UI (these override any values in raw data)
            RestartPolicy: restartPolicy,
            PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
            Binds: binds.length > 0 ? binds : undefined,
            LogConfig: {
                Type: form.basic.logging,
                Config: {},
            },
        },

        // Networking Config - use preserved raw data
        NetworkingConfig: form.raw.networkingConfig,
    }
}
