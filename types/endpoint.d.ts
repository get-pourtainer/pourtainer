export interface Endpoint {
    Id: number
    Name: string
    Type: number
    URL: string
    GroupId: number
    PublicURL: string
    Gpus: any[]
    TLSConfig: TLSConfig
    AzureCredentials: AzureCredentials
    TagIds: any[]
    Status: number
    Snapshots: any[]
    UserAccessPolicies: AccessPolicies
    TeamAccessPolicies: AccessPolicies
    EdgeKey: string
    EdgeCheckinInterval: number
    Kubernetes: Kubernetes
    ComposeSyntaxMaxVersion: string
    SecuritySettings: SecuritySettings
    LastCheckInDate: number
    QueryDate: number
    Heartbeat: boolean
    PostInitMigrations: PostInitMigrations
    Edge: Edge
    Agent: Agent
    AuthorizedUsers: null
    AuthorizedTeams: null
    Tags: null
}

export interface Agent {
    Version: string
}

export interface AzureCredentials {
    ApplicationID: string
    TenantID: string
    AuthenticationKey: string
}

export interface Edge {
    AsyncMode: boolean
    PingInterval: number
    SnapshotInterval: number
    CommandInterval: number
}

export interface Kubernetes {
    Snapshots: any[]
    Configuration: Configuration
    Flags: Flags
}

export interface Configuration {
    UseLoadBalancer: boolean
    UseServerMetrics: boolean
    EnableResourceOverCommit: boolean
    ResourceOverCommitPercentage: number
    StorageClasses: any[]
    IngressClasses: any[]
    RestrictDefaultNamespace: boolean
    IngressAvailabilityPerNamespace: boolean
    AllowNoneIngressClass: boolean
}

export interface Flags {
    IsServerMetricsDetected: boolean
    IsServerIngressClassDetected: boolean
    IsServerStorageDetected: boolean
}

export interface PostInitMigrations {
    MigrateIngresses: boolean
    MigrateGPUs: boolean
}

export interface SecuritySettings {
    allowBindMountsForRegularUsers: boolean
    allowPrivilegedModeForRegularUsers: boolean
    allowVolumeBrowserForRegularUsers: boolean
    allowHostNamespaceForRegularUsers: boolean
    allowDeviceMappingForRegularUsers: boolean
    allowStackManagementForRegularUsers: boolean
    allowContainerCapabilitiesForRegularUsers: boolean
    allowSysctlSettingForRegularUsers: boolean
    enableHostManagementFeatures: boolean
}

export interface TLSConfig {
    TLS: boolean
    TLSSkipVerify: boolean
}

export interface AccessPolicies extends Record<string, any> {}
