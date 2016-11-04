/**
 * Created by cloud on 16-11-4.
 */
export interface ReSolveError extends Error {
    details: string
    missing: string[]
    recursion: boolean
}

export interface ResolveParseResult {
    request: string
    query: string
    module: boolean
    directory: boolean
    file: boolean
}
