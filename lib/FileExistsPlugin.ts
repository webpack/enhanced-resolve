/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

import createInnerCallback = require('./createInnerCallback')

class FileExistsPlugin {
    constructor(source, target) {
        this.source = source
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
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
                this.doResolve(target, request, `existing file: ${file}`, callback, true)
            })
        })
    }
}

export = FileExistsPlugin
