/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

import createInnerCallback = require('./createInnerCallback')
import getInnerRequest = require('./getInnerRequest')

class AliasPlugin {
    constructor(source, options, target) {
        this.source = source
        this.name = options.name
        this.alias = options.alias
        this.onlyModule = options.onlyModule
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        const name = this.name
        const alias = this.alias
        const onlyModule = this.onlyModule
        resolver.plugin(this.source, (request, callback) => {
            const innerRequest = getInnerRequest(resolver, request)
            if (!innerRequest) {
                return callback()
            }
            if (!onlyModule && innerRequest.indexOf(`${name}/`) === 0 || innerRequest === name) {
                if (innerRequest.indexOf(`${alias}/`) !== 0 && innerRequest != alias) {
                    const newRequestStr = alias + innerRequest.substr(name.length)
                    const obj = assign({}, request, {
                        request: newRequestStr
                    })
                    return resolver.doResolve(
                        target,
                        obj,
                        `aliased with mapping '${name}': '${alias}' to '${newRequestStr}'`,
                        createInnerCallback(function (err, result) {
                            if (arguments.length > 0) {
                                return callback(err, result)
                            }

                            // don't allow other aliasing or raw request
                            callback(null, null)
                        }, callback)
                    )
                }
            }
            return callback()
        })
    }
}

export = AliasPlugin
