import type { Middleware } from 'openapi-fetch'

// Newer Portainer releases (2.42 for exec/attach, 2.45 for more) enforce resource
// controls on routes that older versions let through. Clients for those routes
// pass a message so a 403 reads as a clear denial, not a generic failure.
export const ACCESS_DENIED_CONTAINER = 'This token has no access to this container.'
export const ACCESS_DENIED_VOLUME = 'This token has no access to this volume.'

const ORIGIN = /^[a-z]+:\/\/[^/]+/i

// Error raised for any non-2xx API response. `message` is what the server said
// (Portainer `{message, details}` or Docker `{message}`), falling back to the
// caller's description plus the HTTP status when the body is empty.
export class ApiError extends Error {
    readonly status: number
    readonly details?: string

    constructor(message: string, status: number, details?: string) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.details = details
    }
}

export type ErrorOptions = {
    // Statuses that count as success, e.g. Docker's 304 "already stopped"
    allow?: number[]
    // Message for a 403 on a resource-controlled route
    accessDenied?: string
}

// Builds the error for a failed response from its status and raw body text.
export function apiError(
    status: number,
    body: string,
    fallback: string,
    options: ErrorOptions = {}
): ApiError {
    if (options.accessDenied && status === 403) {
        return new ApiError(options.accessDenied, status)
    }

    let parsed: unknown = body
    try {
        parsed = JSON.parse(body)
    } catch {}

    if (parsed && typeof parsed === 'object') {
        const { message, details } = parsed as { message?: unknown; details?: unknown }
        if (typeof message === 'string' && message.trim()) {
            return new ApiError(
                message.trim(),
                status,
                typeof details === 'string' && details.trim() ? details.trim() : undefined
            )
        }
    }

    if (typeof parsed === 'string' && parsed.trim()) {
        return new ApiError(parsed.trim(), status)
    }

    return new ApiError(`${fallback} (HTTP ${status})`, status)
}

// openapi-fetch middleware: rejects with an ApiError on any non-2xx response,
// so callers only ever handle `data`.
export function throwOnError(options: ErrorOptions = {}): Middleware {
    return {
        async onResponse({ request, response }) {
            if (response.ok || options.allow?.includes(response.status)) {
                return undefined
            }
            const body = await response
                .clone()
                .text()
                .catch(() => '')
            const path = request.url.replace(ORIGIN, '').split('?')[0]
            throw apiError(response.status, body, `${request.method} ${path} failed`, options)
        },
    }
}

// The same rule for requests made directly with react-native-blob-util
// (binary bodies and streams the typed clients cannot parse).
export function assertBlobOk(
    response: { respInfo: { status: number }; data: unknown },
    fallback: string,
    options: ErrorOptions = {}
): void {
    const { status } = response.respInfo
    if ((status >= 200 && status < 300) || options.allow?.includes(status)) {
        return
    }
    throw apiError(
        status,
        typeof response.data === 'string' ? response.data : '',
        fallback,
        options
    )
}
