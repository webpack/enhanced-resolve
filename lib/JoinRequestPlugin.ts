/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class JoinRequestPlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
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
