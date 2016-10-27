/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')

class FileExistsPlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, function (this: Resolver, request, callback) {
            const fs = this.fileSystem
            const file = request.path
            fs.stat(file, (err, stat) => {
                if (err || !stat) {
                    if (callback.missing) {
                        callback.missing.push(file)
                    }
                    if (callback.log) {
                        callback.log(`${file} doesn't exist`)
                    }
                    return callback()
                }
                if (!stat.isFile()) {
                    if (callback.missing) {
                        callback.missing.push(file)
                    }
                    if (callback.log) {
                        callback.log(`${file} is not a file`)
                    }
                    return callback()
                }
                this.doResolve(target, request, `existing file: ${file}`, callback)
            })
        })
    }
}

export = FileExistsPlugin
