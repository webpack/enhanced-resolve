/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import createInnerCallback = require('./createInnerCallback')
import DescriptionFileUtils = require('./DescriptionFileUtils')
import Resolver = require('./Resolver')

class DescriptionFilePlugin {
    filenames: string[]

    constructor(public source: string, filenames: string[]|string, public target: string) {
        this.filenames = (<string[]>[]).concat(filenames)
    }

    apply(resolver: Resolver) {
        const filenames = this.filenames
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
            const directory = request.path
            DescriptionFileUtils.loadDescriptionFile(resolver, directory, filenames, (err, result) => {
                if (err) {
                    return callback(err)
                }
                if (!result) {
                    if (callback.missing) {
                        filenames.forEach(filename => {
                            callback.missing.push(resolver.join(directory, filename))
                        })
                    }
                    if (callback.log) {
                        callback.log('No description file found')
                    }
                    return callback()
                }
                const relativePath = `.${request.path.substr(result.directory.length).replace(/\\/g, '/')}`
                const obj = Object.assign({}, request, {
                    descriptionFilePath: result.path,
                    descriptionFileData: result.content,
                    descriptionFileRoot: result.directory,
                    relativePath
                })
                resolver.doResolve(
                    target,
                    obj,
                    `using description file: ${result.path} (relative path: ${relativePath})`,
                    createInnerCallback((err, result) => {
                        if (err) {
                            return callback(err)
                        }
                        if (result) {
                            return callback(null, result)
                        }

                        // Don't allow other description files or none at all
                        callback(null, null)
                    }, callback)
                )
            })
        })
    }
}

export = DescriptionFilePlugin
