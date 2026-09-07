// Docker's images/create pulls EVERY tag of a repository when no tag is given,
// so an untagged reference must be pinned to :latest. Digest references are
// passed through untouched.
export function splitImageReference(reference: string): { fromImage: string; tag?: string } {
    const trimmed = reference.trim()

    if (trimmed.includes('@')) {
        return { fromImage: trimmed }
    }

    const lastSlash = trimmed.lastIndexOf('/')
    const lastColon = trimmed.lastIndexOf(':')

    // A colon after the last slash is a tag; before it, it is a registry port
    if (lastColon > lastSlash) {
        return { fromImage: trimmed.slice(0, lastColon), tag: trimmed.slice(lastColon + 1) }
    }

    return { fromImage: trimmed, tag: 'latest' }
}
