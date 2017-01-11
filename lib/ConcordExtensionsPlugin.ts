/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import concord = require('./concord')
import DescriptionFileUtils = require('./DescriptionFileUtils')
import forEachBail = require('./forEachBail')
import createInnerCallback = require('./createInnerCallback')
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'
import { Dictionary } from './concord'

class ConcordExtensionsPlugin {
    constructor(public source: string, public options: Dictionary<any>, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
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
                    const obj = Object.assign({}, request, {
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
