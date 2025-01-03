export interface User {
    Id: number
    Username: string
    Role: number
    TokenIssueAt: number
    ThemeSettings: {
        color: string
    }
    UseCache: boolean
    PortainerAuthorizations: null
    EndpointAuthorizations: null
    forceChangePassword: boolean
}