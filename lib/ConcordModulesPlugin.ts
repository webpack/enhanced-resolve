/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import concord = require('./concord')
import DescriptionFileUtils = require('./DescriptionFileUtils')
import createInnerCallback = require('./createInnerCallback')
import getInnerRequest = require('./getInnerRequest')
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'
import { Dictionary } from './concord'

class ConcordModulesPlugin {
    constructor(public source: string, public options: Dictionary<any>, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            const innerRequest = getInnerRequest(resolver, request)
            if (!innerRequest) {
                return callback()
            }
            const concordField = DescriptionFileUtils.getField(request.descriptionFileData, 'concord')
            if (!concordField) {
                return callback()
            }
            const data = concord.matchModule(request.context, concordField, innerRequest)
            if (data === innerRequest) {
                return callback()
            }
            if (data === undefined) {
                return callback()
            }
            if (data === false) {
                const ignoreObj = Object.assign({}, request, {
                    path: false
                })
                return callback(null, ignoreObj)
            }
            const obj = Object.assign({}, request, {
                path: request.descriptionFileRoot,
                request: data
            })
            resolver.doResolve(
                target,
                obj,
                `aliased from description file ${request.descriptionFilePath} with mapping '${innerRequest}' to '${data}'`,
                createInnerCallback(function (err: Error, result) {
                    if (arguments.length > 0) {
                        return callback(err, result)
                    }

                    // Don't allow other aliasing or raw request
                    callback(null, null)
                }, callback)
            )
        })
    }
}

export = ConcordModulesPlugin
