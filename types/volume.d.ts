export interface Volume {
    CreatedAt: Date
    Driver: 'local' | string
    Labels: Labels | null
    Mountpoint: string
    Name: string
    Options: Options | null
    ResourceID: string
    Scope: 'local' | string
    Portainer?: Portainer
}

export interface Labels {
    'com.docker.compose.project'?: string
    'com.docker.compose.version'?: string
    'com.docker.compose.volume'?: string
    'com.docker.volume.anonymous'?: string
    [key: string]: string
}

export interface Options {
    device?: string
    o?: string
    type?: string
}

export interface Portainer {
    ResourceControl: ResourceControl
}

export interface ResourceControl {
    Id: number
    ResourceId: string
    SubResourceIds: any[]
    Type: number
    UserAccesses: UserAccess[]
    TeamAccesses: any[]
    Public: boolean
    AdministratorsOnly: boolean
    System: boolean
}

export interface UserAccess {
    UserId: number
    AccessLevel: number
}

export interface VolumeEntity {
    Name: string
    Size: number
    Dir: boolean
    ModTime: number
}
