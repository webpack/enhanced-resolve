/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

import concord = require('./concord')
import DescriptionFileUtils = require('./DescriptionFileUtils')
import forEachBail = require('./forEachBail')
import createInnerCallback = require('./createInnerCallback')

class ConcordExtensionsPlugin {
    constructor(source, options, target) {
        this.source = source
        this.options = options
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, (request, callback) => {
            const concordField = DescriptionFileUtils.getField(request.descriptionFileData, 'concord')
            if (!concordField) {
                return callback()
            }
            const extensions = concord.getExtensions(request.context, concordField)
            if (!extensions) {
                return callback()
            }
            const topLevelCallback = callback
            forEachBail(
                extensions,
                (appending, callback) => {
                    const obj = assign({}, request, {
                        path: request.path + appending,
                        relativePath: request.relativePath && request.relativePath + appending
                    })
                    resolver.doResolve(
                        target,
                        obj,
                        `concord extension: ${appending}`,
                        createInnerCallback(callback, topLevelCallback))
                },
                function (err, result) {
                    if (arguments.length > 0) {
                        return callback(err, result)
                    }

                    callback(null, null)
                }
            )
        })
    }
}

export = ConcordExtensionsPlugin
