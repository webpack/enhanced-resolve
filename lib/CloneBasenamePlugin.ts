/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { basename } from './getPaths'
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'
import Resolver = require('./Resolver')

class CloneBasenamePlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            const filename = basename(request.path)
            const filePath = resolver.join(request.path, filename as string)
            const obj = Object.assign({}, request, {
                path: filePath,
                relativePath: request.relativePath && resolver.join(request.relativePath, filename as string)
            })
            resolver.doResolve(target, obj, `using path: ${filePath}`, callback)
        })
    }
}

export = CloneBasenamePlugin
