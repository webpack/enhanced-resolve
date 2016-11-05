import { Context } from './concord'
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

export interface ResolveResult {
    path: boolean | string
    query: string
}

export interface ResolverRequest {
    request: string
    relativePath?: string
    descriptionFileData?: any
    descriptionFileRoot?: string
    descriptionFilePath?: string
    context: Context
    path: string
    query?: string
    directory?: boolean
    module?: boolean
}

export interface LoggingCallbackTools {
    log?(msg: string): void
    stack?: string[]
    missing?: string[] | {
        push: (item: string) => void
    }
}

export interface LoggingCallbackWrapper extends LoggingCallbackTools {
    (...args: any[]): any
}
