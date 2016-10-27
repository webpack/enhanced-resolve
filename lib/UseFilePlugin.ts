/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

class UseFilePlugin {
    constructor(source, filename, target) {
        this.source = source
        this.filename = filename
        this.target = target
    }

    apply(resolver) {
        const filename = this.filename
        const target = this.target
        resolver.plugin(this.source, (request, callback) => {
            const fs = resolver.fileSystem
            const topLevelCallback = callback
            const filePath = resolver.join(request.path, filename)
            const obj = assign({}, request, {
                path: filePath,
                relativePath: request.relativePath && resolver.join(request.relativePath, filename)
            })
            resolver.doResolve(target, obj, `using path: ${filePath}`, callback)
        })
    }
}

export = UseFilePlugin
