/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class TryNextPlugin {
    constructor(public source: string, public message: string, public target: string) {
    }

    apply(resolver) {
        const target = this.target
        const message = this.message
        resolver.plugin(this.source, function (request, callback) {
            resolver.doResolve(target, request, message, callback)
        })
    }
}

export = TryNextPlugin
