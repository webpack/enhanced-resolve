/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class NextPlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
            resolver.doResolve(target, request, null, callback)
        })
    }
}

export = NextPlugin
