/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

import DescriptionFileUtils = require('./DescriptionFileUtils')
import createInnerCallback = require('./createInnerCallback')
import getInnerRequest = require('./getInnerRequest')

class AliasFieldPlugin {
    constructor(source, field, target) {
        this.source = source
        this.field = field
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        const field = this.field
        resolver.plugin(this.source, (request, callback) => {
            if (!request.descriptionFileData) {
                return callback()
            }
            const innerRequest = getInnerRequest(resolver, request)
            if (!innerRequest) {
                return callback()
            }
            const fieldData = DescriptionFileUtils.getField(request.descriptionFileData, field)
            if (typeof fieldData !== 'object') {
                if (callback.log) {
                    callback.log(`Field '${field}' doesn't contain a valid alias configuration`)
                }
                return callback()
            }
            const data1 = fieldData[innerRequest]
            const data2 = fieldData[innerRequest.replace(/^\.\//, '')]
            const data = typeof data1 !== 'undefined' ? data1 : data2
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

export = AliasFieldPlugin
