/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ParsePlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
            const parsed = resolver.parse(request.request)
            const obj = Object.assign({}, request, parsed)
            if (request.query && !parsed.query) {
                obj.query = request.query
            }
            if (callback.log) {
                if (parsed.module) {
                    callback.log('Parsed request is a module')
                }
                if (parsed.directory) {
                    callback.log('Parsed request is a directory')
                }
            }
            resolver.doResolve(target, obj, null, callback)
        })
    }
}

export = ParsePlugin
