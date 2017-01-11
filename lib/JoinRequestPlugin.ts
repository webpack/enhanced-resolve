/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class JoinRequestPlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            const obj = Object.assign({}, request, {
                path: resolver.join(request.path, request.request),
                relativePath: request.relativePath && resolver.join(request.relativePath, request.request),
                request: undefined
            })
            resolver.doResolve(target, obj, null, callback)
        })
    }
}

export = JoinRequestPlugin
