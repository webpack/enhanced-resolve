/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')

class ModuleAppendPlugin {
    constructor(public source: string, public appending: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const appending = this.appending
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
            const i = request.request.indexOf('/')
            const j = request.request.indexOf('\\')
            const p = i < 0 ? j : j < 0 ? i : i < j ? i : j
            let moduleName
            let remainingRequest
            if (p < 0) {
                moduleName = request.request
                remainingRequest = ''
            }
            else {
                moduleName = request.request.substr(0, p)
                remainingRequest = request.request.substr(p)
            }
            if (moduleName === '.' || moduleName === '..') {
                return callback()
            }
            const moduleFinalName = moduleName + appending
            const obj = Object.assign({}, request, {
                request: moduleFinalName + remainingRequest
            })
            resolver.doResolve(target, obj, `module variation ${moduleFinalName}`, callback)
        })
    }
}

export = ModuleAppendPlugin
