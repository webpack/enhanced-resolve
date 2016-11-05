/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import createInnerCallback = require('./createInnerCallback')
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class ModuleKindPlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            if (!request.module) {
                return callback()
            }
            const obj = Object.assign({}, request)
            delete obj.module
            resolver.doResolve(target, obj, 'resolve as module', createInnerCallback(function (err, result) {
                if (arguments.length > 0) {
                    return callback(err, result)
                }

                // Don't allow other alternatives
                callback(null, null)
            }, callback))
        })
    }
}

export = ModuleKindPlugin
