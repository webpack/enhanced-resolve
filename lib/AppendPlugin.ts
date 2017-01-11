/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class AppendPlugin {
    constructor(public source: string, public appending: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        const appending = this.appending
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            const obj = Object.assign({}, request, {
                path: request.path + appending,
                relativePath: request.relativePath && request.relativePath + appending
            })
            resolver.doResolve(target, obj, appending, callback)
        })
    }
}

export = AppendPlugin
