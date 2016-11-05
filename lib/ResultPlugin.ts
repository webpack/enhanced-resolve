/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class ResultPlugin {
    constructor(public source: string) {
    }

    apply(resolver: Resolver) {
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            const obj = Object.assign({}, request)
            resolver.applyPluginsAsync('result', obj, err => {
                if (err) {
                    return callback(err)
                }
                callback(null, obj)
            })
        })
    }
}

export = ResultPlugin
