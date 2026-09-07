// Docker returns container logs in two framings:
// - application/vnd.docker.multiplexed-stream (Tty: false): 8-byte frame headers
//   [stream type, 0, 0, 0, length(4, big-endian)] followed by the payload
// - application/vnd.docker.raw-stream (Tty: true): plain bytes, usually with CRLF
const RAW_STREAM = 'application/vnd.docker.raw-stream'

const decoder = new TextDecoder()
const CRLF = /\r\n?/g

function isFrameHeader(bytes: Uint8Array, position: number): boolean {
    if (position + 8 > bytes.length) return false
    const streamType = bytes[position]
    return (
        (streamType === 0 || streamType === 1 || streamType === 2) &&
        bytes[position + 1] === 0 &&
        bytes[position + 2] === 0 &&
        bytes[position + 3] === 0
    )
}

function normalise(text: string): string {
    return text.replace(CRLF, '\n')
}

function demultiplex(bytes: Uint8Array): string {
    // Without a valid first header this is a raw stream after all
    if (!isFrameHeader(bytes, 0)) {
        return normalise(decoder.decode(bytes))
    }

    let result = ''
    let position = 0

    while (position < bytes.length) {
        if (!isFrameHeader(bytes, position)) {
            // Corrupt or truncated frame: keep whatever is left as text
            result += decoder.decode(bytes.subarray(position))
            break
        }

        const length =
            ((bytes[position + 4] << 24) |
                (bytes[position + 5] << 16) |
                (bytes[position + 6] << 8) |
                bytes[position + 7]) >>>
            0
        position += 8

        const end = Math.min(position + length, bytes.length)
        result += decoder.decode(bytes.subarray(position, end))
        position = end
    }

    return normalise(result)
}

export function decodeDockerLogs(bytes: Uint8Array, contentType: string | undefined): string {
    if (contentType?.toLowerCase().startsWith(RAW_STREAM)) {
        return normalise(decoder.decode(bytes))
    }

    return demultiplex(bytes)
}
