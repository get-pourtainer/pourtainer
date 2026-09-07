import type { paths as generatedPaths } from '@/lib/portainer/schema'

// Portainer dropped these three agent routes from its OpenAPI document in 2.39,
// but the Docker proxy still forwards every `/v2/browse/*` path to the agent
// (checked against the 2.45.0 source). Keep their shapes here so the generated
// schema can be refreshed without losing them.
type BrowseEntry = {
    Name: string
    Size: number
    Dir: boolean
    ModTime: number
}

type EmptyResponses = {
    204: { headers: { [name: string]: unknown }; content?: never }
    400: { headers: { [name: string]: unknown }; content?: never }
    500: { headers: { [name: string]: unknown }; content?: never }
}

type BrowsePaths = {
    '/endpoints/{id}/docker/v2/browse/ls': {
        parameters: { query?: never; header?: never; path?: never; cookie?: never }
        get: {
            parameters: {
                query: { path: string; volumeID: string }
                header?: never
                path: { id: number }
                cookie?: never
            }
            requestBody?: never
            responses: {
                200: {
                    headers: { [name: string]: unknown }
                    content: { 'application/json': BrowseEntry[] }
                }
                400: { headers: { [name: string]: unknown }; content?: never }
                500: { headers: { [name: string]: unknown }; content?: never }
            }
        }
        put?: never
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/endpoints/{id}/docker/v2/browse/rename': {
        parameters: { query?: never; header?: never; path?: never; cookie?: never }
        get?: never
        put: {
            parameters: {
                query?: { volumeID?: string }
                header?: never
                path: { id: number }
                cookie?: never
            }
            requestBody?: {
                content: { 'application/json': { CurrentFilePath: string; NewFilePath: string } }
            }
            responses: EmptyResponses
        }
        post?: never
        delete?: never
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
    '/endpoints/{id}/docker/v2/browse/delete': {
        parameters: { query?: never; header?: never; path?: never; cookie?: never }
        get?: never
        put?: never
        post?: never
        delete: {
            parameters: {
                query: { path: string; volumeID: string }
                header?: never
                path: { id: number }
                cookie?: never
            }
            requestBody?: never
            responses: EmptyResponses
        }
        options?: never
        head?: never
        patch?: never
        trace?: never
    }
}

export type paths = generatedPaths & BrowsePaths
