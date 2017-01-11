/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class LogInfoPlugin {
    constructor(public source: string) {
    }

    apply(resolver: Resolver) {
        const source = this.source
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            if (!callback.log) {
                return callback()
            }
            const log = callback.log
            const prefix = `[${source}] `
            if (request.path) {
                log(`${prefix}Resolving in directory: ${request.path}`)
            }
            if (request.request) {
                log(`${prefix}Resolving request: ${request.request}`)
            }
            if (request.module) {
                log(`${prefix}Request is an module request.`)
            }
            if (request.directory) {
                log(`${prefix}Request is a directory request.`)
            }
            if (request.query) {
                log(`${prefix}Resolving request query: ${request.query}`)
            }
            if (request.descriptionFilePath) {
                log(`${prefix}Has description data from ${request.descriptionFilePath}`)
            }
            if (request.relativePath) {
                log(`${prefix}Relative path from description file is: ${request.relativePath}`)
            }
            callback()
        })
    }
}

export = LogInfoPlugin
