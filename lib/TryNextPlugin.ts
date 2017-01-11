/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class TryNextPlugin {
    constructor(public source: string, public message: string | null, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        const message = this.message
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            resolver.doResolve(target, request, message, callback)
        })
    }
}

export = TryNextPlugin
