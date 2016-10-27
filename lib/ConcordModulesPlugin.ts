/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

import concord = require('./concord')
import DescriptionFileUtils = require('./DescriptionFileUtils')
import createInnerCallback = require('./createInnerCallback')
import getInnerRequest = require('./getInnerRequest')

class ConcordModulesPlugin {
    constructor(source, options, target) {
        this.source = source
        this.options = options
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        const options = this.options
        resolver.plugin(this.source, (request, callback) => {
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
                const ignoreObj = assign({}, request, {
                    path: false
                })
                return callback(null, ignoreObj)
            }
            const obj = assign({}, request, {
                path: request.descriptionFileRoot,
                request: data
            })
            resolver.doResolve(
                target,
                obj,
                `aliased from description file ${request.descriptionFilePath} with mapping '${innerRequest}' to '${data}'`,
                createInnerCallback(function (err, result) {
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
