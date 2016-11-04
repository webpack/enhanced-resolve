/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')

class AppendPlugin {
    constructor(public source: string, public appending: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        const appending = this.appending
        resolver.plugin(this.source, function (request, callback) {
            const obj = Object.assign({}, request, {
                path: request.path + appending,
                relativePath: request.relativePath && request.relativePath + appending
            })
            resolver.doResolve(target, obj, appending, callback)
        })
    }
}

export = AppendPlugin
