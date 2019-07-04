/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = class JoinRequestPartPlugin {
	constructor(source, target) {
		this.source = source;
		this.target = target;
	}

	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync(
				"JoinRequestPartPlugin",
				(request, resolveContext, callback) => {
					const req = request.request;
					const i = req.indexOf("/", 3);
					let moduleName, remainingRequest;
					if (i < 0) {
						moduleName = req;
						remainingRequest = "";
					} else {
						moduleName = req.slice(0, i);
						remainingRequest = "." + req.slice(i);
					}
					const obj = {
						...request,
						path: resolver.join(request.path, moduleName),
						relativePath:
							request.relativePath &&
							resolver.join(request.relativePath, moduleName),
						request: remainingRequest
					};
					resolver.doResolve(target, obj, null, resolveContext, callback);
				}
			);
	}
};
