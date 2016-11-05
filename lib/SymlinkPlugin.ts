/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import getPaths from './getPaths'
import forEachBail = require('./forEachBail')
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class SymlinkPlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            const _this = this
            const fs = _this.fileSystem
            const pathsResult = getPaths(request.path)
            const pathSeqments = pathsResult.seqments
            const paths = pathsResult.paths

            let containsSymlink = false
            forEachBail(paths.map((_, i) => i), (idx, callback) => {
                fs.readlink(paths[idx], (err, result) => {
                    if (!err && result) {
                        pathSeqments[idx] = result
                        containsSymlink = true
                        // Shortcut when absolute symlink found
                        if (/^(\/|[a-zA-z]:($|\\))/.test(result)) {
                            return callback(null, idx)
                        }
                    }
                    callback()
                })
            }, (err, idx) => {
                if (!containsSymlink) {
                    return callback()
                }
                const resultSeqments = typeof idx === 'number' ? pathSeqments.slice(0, idx + 1) : pathSeqments.slice()
                const result = resultSeqments.reverse().reduce((a, b) => _this.join(a, b))
                const obj = Object.assign({}, request, {
                    path: result
                })
                resolver.doResolve(target, obj, `resolved symlink to ${result}`, callback)
            })
        })
    }
}

export = SymlinkPlugin
