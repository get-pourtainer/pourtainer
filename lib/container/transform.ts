import type { components } from '@/lib/docker/schema'
import { shellJoin, shellSplit } from './shell'

// Extract types from schema instead of redeclaring them
export type LoggingDriver = NonNullable<
    NonNullable<components['schemas']['HostConfig']['LogConfig']>['Type']
>
export type RestartPolicy = NonNullable<components['schemas']['RestartPolicy']['Name']>
export type ConsoleMode = 'interactive-tty' | 'tty' | 'interactive' | 'none'

type Mount = NonNullable<components['schemas']['HostConfig']['Mounts']>[number]

// UI-friendly form types
export interface ContainerEditForm {
    basic: {
        name: string
        image: string
        // '' keeps the daemon's default logging driver
        logging: LoggingDriver | ''
        restartPolicy: RestartPolicy
    }
    ports: PortMapping[]
    commands: {
        // One line each, tokenised with shellSplit on save
        command: string
        entrypoint: string
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
        // Kept so an unchanged driver keeps its options and an unchanged
        // policy keeps its retry count
        originalLogging: LoggingDriver | ''
        logConfigOptions: Record<string, string>
        maximumRetryCount: number
    }
}

export interface PortMapping {
    hostPort: string
    containerPort: string
    protocol: 'tcp' | 'udp'
    // Preserved from the inspect response; not edited in the UI
    hostIp?: string
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
    // Original bind mode flags (e.g. "z", "rprivate") so they survive a save
    mode?: string
    // Index into HostConfig.Mounts when the row came from there (compose long
    // syntax); such rows are written back to Mounts instead of Binds
    mountIndex?: number
}

type ContainerInspectResponse = components['schemas']['ContainerInspectResponse']
type ContainerCreateRequest = components['schemas']['ContainerConfig'] & {
    HostConfig: components['schemas']['HostConfig']
    NetworkingConfig: components['schemas']['NetworkingConfig']
}

const RESTART_POLICIES: RestartPolicy[] = ['always', 'on-failure', 'unless-stopped', 'no']

function toConsoleMode(interactive: boolean, tty: boolean): ConsoleMode {
    if (interactive && tty) return 'interactive-tty'
    if (tty) return 'tty'
    if (interactive) return 'interactive'
    return 'none'
}

// Bind mode flags ("ro,z") without the access bit, which the form owns
function modeFlags(mode: string | undefined): string[] {
    return (mode || '').split(',').filter((flag) => flag && flag !== 'ro' && flag !== 'rw')
}

export function inspectResponseToEditForm(container: ContainerInspectResponse): ContainerEditForm {
    const config = container.Config as components['schemas']['ContainerConfig'] | undefined
    const hostConfig = container.HostConfig as components['schemas']['HostConfig'] | undefined

    const policyName = hostConfig?.RestartPolicy?.Name
    const restartPolicy: RestartPolicy = RESTART_POLICIES.includes(policyName as RestartPolicy)
        ? (policyName as RestartPolicy)
        : '' // Default to empty string (None)

    // Docker keeps interactivity of a detached container in OpenStdin, not AttachStdin
    const console = toConsoleMode(!!config?.OpenStdin, !!config?.Tty)

    const ports: PortMapping[] = []
    if (hostConfig?.PortBindings) {
        for (const [containerPortProto, bindings] of Object.entries(hostConfig.PortBindings)) {
            const [containerPort, protocol] = containerPortProto.split('/')
            if (Array.isArray(bindings)) {
                for (const binding of bindings) {
                    if (binding?.HostPort) {
                        ports.push({
                            hostPort: binding.HostPort,
                            containerPort,
                            protocol: protocol as 'tcp' | 'udp',
                            hostIp: binding.HostIp || undefined,
                        })
                    }
                }
            }
        }
    }

    const env: KeyValuePair[] = (config?.Env || []).map((envVar: string) => {
        const [key, ...valueParts] = envVar.split('=')
        return { key, value: valueParts.join('=') }
    })

    const labels: KeyValuePair[] = Object.entries(config?.Labels || {}).map(([key, value]) => ({
        key,
        value: String(value),
    }))

    // Volumes come from the resolved Mounts list. Rows that originate from
    // HostConfig.Mounts remember their index so they are written back there;
    // everything else (Binds, or new rows) becomes a Binds entry on save.
    const hostMounts = hostConfig?.Mounts || []
    const volumes: VolumeMapping[] = (container.Mounts || [])
        .filter((mount) => mount.Type === 'volume' || mount.Type === 'bind')
        .map((mount) => {
            const mountIndex = hostMounts.findIndex(
                (hostMount) =>
                    hostMount.Target === mount.Destination &&
                    (hostMount.Type === mount.Type || hostMount.Type === undefined)
            )
            const flags = modeFlags(mount.Mode)
            return {
                containerPath: mount.Destination || '',
                hostPath: mount.Type === 'volume' ? mount.Name || '' : mount.Source || '',
                type: mount.Type === 'volume' ? 'volume' : 'bind',
                readOnly: mount.RW === false,
                // Docker reports a default "z" mode on named volumes; only bind
                // mounts carry user-chosen flags worth writing back
                mode: mount.Type === 'bind' && flags.length > 0 ? flags.join(',') : undefined,
                mountIndex: mountIndex >= 0 ? mountIndex : undefined,
            }
        })

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

    // Preserve unmapped HostConfig properties (Memory and Mounts included)
    const { RestartPolicy, PortBindings, Binds, LogConfig, ...preservedHostConfig } =
        hostConfig || {}

    const originalLogging = (LogConfig?.Type as LoggingDriver | undefined) ?? ''

    return {
        basic: {
            name: container.Name?.replace(/^\//, '') || '',
            image: config?.Image || '',
            logging: originalLogging,
            restartPolicy,
        },
        ports,
        commands: {
            command: shellJoin(config?.Cmd || []),
            entrypoint: shellJoin(config?.Entrypoint || []),
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
            originalLogging,
            logConfigOptions: (LogConfig?.Config as Record<string, string> | undefined) ?? {},
            maximumRetryCount: RestartPolicy?.MaximumRetryCount ?? 0,
        },
    }
}

function bindMode(volume: VolumeMapping): string {
    const flags = [...(volume.mode ? volume.mode.split(',') : [])]
    if (volume.readOnly) flags.unshift('ro')
    return flags.length > 0 ? `:${flags.join(',')}` : ''
}

export function editFormToCreateRequest(form: ContainerEditForm): ContainerCreateRequest {
    const restartPolicy: components['schemas']['RestartPolicy'] = {
        Name: form.basic.restartPolicy,
        MaximumRetryCount:
            form.basic.restartPolicy === 'on-failure' ? form.raw.maximumRetryCount : undefined,
    }

    const interactive = form.commands.console.includes('interactive')
    const tty = form.commands.console.includes('tty')

    // Several host ports may map to one container port; keep them all
    const portBindings: components['schemas']['PortMap'] = {}
    for (const port of form.ports) {
        if (!port.hostPort.trim() || !port.containerPort.trim()) continue
        const key = `${port.containerPort}/${port.protocol}`
        const bindings = portBindings[key] ?? []
        bindings.push({ HostPort: port.hostPort, HostIp: port.hostIp || undefined })
        portBindings[key] = bindings
    }

    const env = form.env
        .filter(({ key }) => key.trim() !== '')
        .map(({ key, value }) => `${key}=${value}`)

    const labels: Record<string, string> = {}
    for (const { key, value } of form.labels.filter(({ key }) => key.trim() !== '')) {
        labels[key] = value
    }

    const validVolumes = form.volumes.filter(
        (volume) => volume.containerPath.trim() !== '' && volume.hostPath.trim() !== ''
    )

    // Rows that came from HostConfig.Mounts are written back there (deleted rows
    // drop the entry); every other volume or bind row becomes a Binds string.
    const mounts = (form.raw.hostConfig.Mounts || [])
        .map((mount, index): Mount | null => {
            if (mount.Type !== 'volume' && mount.Type !== 'bind') return mount
            const row = validVolumes.find((volume) => volume.mountIndex === index)
            if (!row) return null
            return {
                ...mount,
                Type: row.type,
                Source: row.hostPath,
                Target: row.containerPath,
                ReadOnly: row.readOnly,
            }
        })
        .filter((mount): mount is Mount => mount !== null)

    const binds = validVolumes
        .filter((volume) => volume.mountIndex === undefined)
        .map((volume) => `${volume.hostPath}:${volume.containerPath}${bindMode(volume)}`)

    const command = shellSplit(form.commands.command)
    const entrypoint = shellSplit(form.commands.entrypoint)

    const logging = form.basic.logging
    const logConfig = logging
        ? {
              Type: logging,
              // Options only make sense for the driver they were set on
              Config: logging === form.raw.originalLogging ? form.raw.logConfigOptions : {},
          }
        : undefined

    return {
        // Container Config - merge UI values with preserved raw data
        ...form.raw.containerConfig,
        Image: form.basic.image,
        Cmd: command.length > 0 ? command : undefined,
        Entrypoint: entrypoint.length > 0 ? entrypoint : undefined,
        WorkingDir: form.commands.workingDir || undefined,
        User: form.commands.user || undefined,
        Env: env.length > 0 ? env : undefined,
        Labels: Object.keys(labels).length > 0 ? labels : undefined,
        AttachStdin: interactive,
        AttachStdout: true,
        AttachStderr: true,
        Tty: tty,
        OpenStdin: interactive,
        StdinOnce: false,
        ArgsEscaped: null,
        NetworkDisabled: null,
        MacAddress: null,
        OnBuild: null,

        HostConfig: {
            ...form.raw.hostConfig,
            // Memory is required by the schema; 0 is Docker's own "no limit"
            Memory: form.raw.hostConfig.Memory ?? 0,
            RestartPolicy: restartPolicy,
            PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
            Binds: binds.length > 0 ? binds : undefined,
            Mounts: mounts.length > 0 ? mounts : undefined,
            LogConfig: logConfig,
        },

        NetworkingConfig: form.raw.networkingConfig,
    }
}
