export interface Container {
    Command: string
    Created: number
    HostConfig: ContainerHostConfig
    Id: string
    Image: string
    ImageID: string
    Labels: ContainerLabels
    Mounts: ContainerMount[]
    Names: string[]
    NetworkSettings: ContainerNetworkSettings
    Ports: ContainerPort[]
    State: string
    Status: string
    Portainer?: ContainerPortainer
    IsPortainer?: boolean
}

export interface ContainerHostConfig {
    NetworkMode: string
}

export interface ContainerLabels {
    'com.docker.compose.config-hash'?: string
    'com.docker.compose.container-number'?: string
    'com.docker.compose.depends_on'?: string
    'com.docker.compose.image'?: string
    'com.docker.compose.oneoff'?: string
    'com.docker.compose.project'?: string
    'com.docker.compose.project.config_files'?: string
    'com.docker.compose.project.working_dir'?: string
    'com.docker.compose.service'?: string
    'com.docker.compose.version'?: string
    'org.opencontainers.image.ref.name'?: string
    'org.opencontainers.image.version'?: string
    'docker-volume-backup.stop-during-backup'?: string
    'org.opencontainers.image.source'?: string
    'docker-volume-backup.archive-pre'?: string
    'org.opencontainers.image.created'?: string
    'org.opencontainers.image.description'?: string
    'org.opencontainers.image.licenses'?: string
    'org.opencontainers.image.revision'?: string
    'org.opencontainers.image.title'?: string
    'org.opencontainers.image.url'?: string
    'com.docker.desktop.extension.api.version'?: string
    'com.docker.desktop.extension.icon'?: string
    'com.docker.extension.additional-urls'?: string
    'com.docker.extension.detailed-description'?: string
    'com.docker.extension.publisher-url'?: string
    'com.docker.extension.screenshots'?: string
    'io.portainer.server'?: string
    'org.opencontainers.image.vendor'?: string
    maintainer?: string
    'com.docker.compose.replace'?: string
    'org.label-schema.cmd'?: string
    'org.label-schema.description'?: string
    'org.label-schema.license'?: string
    'org.label-schema.name'?: string
    'org.label-schema.schema-version'?: string
    'org.label-schema.url'?: string
    'org.label-schema.vcs-url'?: string
}

export interface ContainerMount {
    Destination: string
    Mode: string
    Propagation: string
    RW: boolean
    Source: string
    Type: string
    Driver?: string
    Name?: string
}

export interface ContainerNetworkSettings {
    Networks: ContainerNetworks
}

export interface ContainerNetworks {
    [key: string]: ContainerNetwork
}

export interface ContainerNetwork {
    Aliases: any
    DNSNames: any
    DriverOpts: any
    EndpointID: string
    Gateway: string
    GlobalIPv6Address: string
    GlobalIPv6PrefixLen: number
    IPAMConfig: Record<string, any>
    IPAddress: string
    IPPrefixLen: number
    IPv6Gateway: string
    Links: any
    MacAddress: string
    NetworkID: string
}

export interface ContainerPort {
    IP?: string
    PrivatePort: number
    PublicPort?: number
    Type: string
}

export interface ContainerPortainer {
    ResourceControl: ContainerResourceControl
}

export interface ContainerResourceControl {
    Id: number
    ResourceId: string
    SubResourceIds: any[]
    Type: number
    UserAccesses: any[]
    TeamAccesses: any[]
    Public: boolean
    AdministratorsOnly: boolean
    System: boolean
}
