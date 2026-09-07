// Minimal POSIX-style tokenizer for the Command / Entrypoint fields. Docker
// stores these as argv arrays; the form edits them as one line, so quoting has
// to round-trip: shellJoin(shellSplit(s)) keeps the same tokens.
const WHITESPACE = /\s/
const SAFE_TOKEN = /^[A-Za-z0-9_\-./:=@%+,]+$/
const DOUBLE_QUOTE_SPECIALS = /(["\\$`])/g

export function shellSplit(input: string): string[] {
    const args: string[] = []
    let current = ''
    let quote: '"' | "'" | null = null
    let escaped = false
    let hasToken = false

    for (const ch of input) {
        if (escaped) {
            current += ch
            escaped = false
            hasToken = true
            continue
        }
        if (ch === '\\' && quote !== "'") {
            escaped = true
            continue
        }
        if (quote) {
            if (ch === quote) {
                quote = null
            } else {
                current += ch
            }
            continue
        }
        if (ch === '"' || ch === "'") {
            quote = ch
            hasToken = true
            continue
        }
        if (WHITESPACE.test(ch)) {
            if (hasToken) {
                args.push(current)
                current = ''
                hasToken = false
            }
            continue
        }
        current += ch
        hasToken = true
    }

    if (escaped) current += '\\'
    if (hasToken) args.push(current)

    return args
}

function quoteArg(arg: string): string {
    if (arg === '') return "''"
    if (SAFE_TOKEN.test(arg)) return arg
    if (!arg.includes("'")) return `'${arg}'`
    return `"${arg.replace(DOUBLE_QUOTE_SPECIALS, '\\$1')}"`
}

export function shellJoin(args: string[]): string {
    return args.map(quoteArg).join(' ')
}
