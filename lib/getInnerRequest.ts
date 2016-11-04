/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')

export = function getInnerRequest(
    resolver: Resolver, request: {
        request: string
        relativePath: string
    }
) {
    let innerRequest
    if (request.request) {
        innerRequest = request.request
        if (/^\.\.?\//.test(innerRequest) && request.relativePath) {
            innerRequest = resolver.join(request.relativePath, innerRequest)
        }
    }
    else {
        innerRequest = request.relativePath
    }
    return innerRequest
}
