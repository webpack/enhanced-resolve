/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import createInnerCallback = require('./createInnerCallback')
import Resolver = require('./Resolver')
import { ResolverRequest, LoggingCallbackWrapper } from './common-types'

class UnsafeCachePlugin {
    constructor(
        public source: string,
        public filterPredicate: (request: ResolverRequest) => boolean,
        public cache: Object = {},
        public target: string
    ) {
    }

    apply(resolver: Resolver) {
        const filterPredicate = this.filterPredicate
        const cache = this.cache
        const target = this.target
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            if (!filterPredicate(request)) {
                return callback()
            }
            const cacheId = getCacheId(request)
            const cacheEntry = cache[cacheId]
            if (cacheEntry) {
                return callback(null, cacheEntry)
            }
            resolver.doResolve(target, request, null, createInnerCallback((err, result) => {
                if (err) {
                    return callback(err)
                }
                if (result) {
                    return callback(null, cache[cacheId] = result)
                }
                callback()
            }, callback))
        })
    }
}

export = UnsafeCachePlugin

function getCacheId(request) {
    return JSON.stringify({
        context: request.context,
        path: request.path,
        query: request.query,
        request: request.request
    })
}
