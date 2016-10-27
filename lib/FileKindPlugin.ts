/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

class FileKindPlugin {
    constructor(source, target) {
        this.source = source
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, (request, callback) => {
            if (request.directory) {
                return callback()
            }
            const obj = assign({}, request)
            delete obj.directory
            resolver.doResolve(target, obj, null, callback)
        })
    }
}

export = FileKindPlugin
