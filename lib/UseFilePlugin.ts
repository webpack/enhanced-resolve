/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class UseFilePlugin {
    constructor(public source: string, public filename: string, public target: string) {
    }

    apply(resolver) {
        const filename = this.filename
        const target = this.target
        resolver.plugin(this.source, (request, callback) => {
            const filePath = resolver.join(request.path, filename)
            const obj = Object.assign({}, request, {
                path: filePath,
                relativePath: request.relativePath && resolver.join(request.relativePath, filename)
            })
            resolver.doResolve(target, obj, `using path: ${filePath}`, callback)
        })
    }
}

export = UseFilePlugin
