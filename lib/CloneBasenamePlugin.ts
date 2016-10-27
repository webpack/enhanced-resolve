/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { basename } from './getPaths'
import assign = require('object-assign')

class CloneBasenamePlugin {
    constructor(source, target) {
        this.source = source
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, (request, callback) => {
            const fs = resolver.fileSystem
            const topLevelCallback = callback
            const filename = basename(request.path)
            const filePath = resolver.join(request.path, filename)
            const obj = assign({}, request, {
                path: filePath,
                relativePath: request.relativePath && resolver.join(request.relativePath, filename)
            })
            resolver.doResolve(target, obj, `using path: ${filePath}`, callback)
        })
    }
}

export = CloneBasenamePlugin
