/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

class JoinRequestPlugin {
    constructor(source, target) {
        this.source = source
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, (request, callback) => {
            const obj = assign({}, request, {
                path: resolver.join(request.path, request.request),
                relativePath: request.relativePath && resolver.join(request.relativePath, request.request),
                request: undefined
            })
            resolver.doResolve(target, obj, null, callback)
        })
    }
}

export = JoinRequestPlugin
