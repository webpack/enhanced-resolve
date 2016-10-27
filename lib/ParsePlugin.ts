/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

class ParsePlugin {
    constructor(source, target) {
        this.source = source
        this.target = target
    }

    apply(resolver) {
        resolver.plugin(this.source, (request, callback) => {
            const parsed = resolver.parse(request.request)
            const obj = assign({}, request, parsed)
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
            resolver.doResolve(this.target, obj, null, callback)
        })
    }
}

export = ParsePlugin
