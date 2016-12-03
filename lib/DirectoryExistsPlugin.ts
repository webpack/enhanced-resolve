/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class DirectoryExistsPlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        resolver.plugin(this.source, function (
            this: Resolver, request: ResolverRequest,
            callback: LoggingCallbackWrapper
        ) {
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
