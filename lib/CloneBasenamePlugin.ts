/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { basename } from './getPaths'

class CloneBasenamePlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
            const filename = basename(request.path)
            const filePath = resolver.join(request.path, filename)
            const obj = Object.assign({}, request, {
                path: filePath,
                relativePath: request.relativePath && resolver.join(request.relativePath, filename)
            })
            resolver.doResolve(target, obj, `using path: ${filePath}`, callback)
        })
    }
}

export = CloneBasenamePlugin
