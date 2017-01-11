/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class ModulesInRootPlugin {
    constructor(public source: string, public path: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        const path = this.path
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            const obj = Object.assign({}, request, {
                path,
                request: `./${request.request}`
            })
            resolver.doResolve(target, obj, `looking for modules in ${path}`, callback)
        })
    }
}

export = ModulesInRootPlugin
