export interface Network {
    Attachable: boolean
    ConfigFrom: ConfigFrom
    ConfigOnly: boolean
    Containers: { [key: string]: Container }
    Created: Date
    Driver: string
    EnableIPv6: boolean
    IPAM: IPAM
    Id: string
    Ingress: boolean
    Internal: boolean
    Labels: Labels
    Name: string
    Options: Options
    Portainer: Portainer
    Scope: string
}

export interface ConfigFrom {
    Network: string
}

export interface Container {
    EndpointID: string
    IPv4Address: string
    IPv6Address: string
    MacAddress: string
    Name: string
}

export interface IPAM {
    Config: Config[] | null
    Driver: string
    Options: null
}

export interface Config {
    Gateway: string
    Subnet: string
}

export interface Labels {}

export interface Options {
    'com.docker.network.bridge.default_bridge'?: string
    'com.docker.network.bridge.enable_icc'?: string
    'com.docker.network.bridge.enable_ip_masquerade'?: string
    'com.docker.network.bridge.host_binding_ipv4'?: string
    'com.docker.network.bridge.name'?: string
    'com.docker.network.driver.mtu'?: string
}

export interface Portainer {
    ResourceControl: ResourceControl
}

export interface ResourceControl {
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
