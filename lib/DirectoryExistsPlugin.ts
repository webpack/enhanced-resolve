/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

import createInnerCallback = require('./createInnerCallback')

class DirectoryExistsPlugin {
    constructor(source, target) {
        this.source = source
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
            const fs = this.fileSystem
            const directory = request.path
            fs.stat(directory, (err, stat) => {
                if (err || !stat) {
                    if (callback.missing) {
                        callback.missing.push(directory)
                    }
                    if (callback.log) {
                        callback.log(`${directory} doesn't exist`)
                    }
                    return callback()
                }
                if (!stat.isDirectory()) {
                    if (callback.missing) {
                        callback.missing.push(directory)
                    }
                    if (callback.log) {
                        callback.log(`${directory} is not a directory`)
                    }
                    return callback()
                }
                this.doResolve(target, request, 'existing directory', callback)
            })
        })
    }
}

export = DirectoryExistsPlugin
