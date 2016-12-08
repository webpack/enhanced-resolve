/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')
import { ResolverRequest } from './common-types'

export = function getInnerRequest(resolver: Resolver, request: ResolverRequest) {
    if (typeof request.__innerRequest === 'string' && request.__innerRequest_request === request.request && request.__innerRequest_relativePath === request.relativePath) {
        return request.__innerRequest;
    }
    let innerRequest: string | undefined;
    if (request.request) {
        innerRequest = request.request;
        if (/^\.\.?\//.test(innerRequest) && request.relativePath) {
            innerRequest = resolver.join(request.relativePath, innerRequest);
        }
    }
    else {
        innerRequest = request.relativePath;
    }
    request.__innerRequest_request = request.request;
    request.__innerRequest_relativePath = request.relativePath;
    return request.__innerRequest = innerRequest;
};
