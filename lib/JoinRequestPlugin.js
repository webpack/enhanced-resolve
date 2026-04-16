/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const cloneRequest = require("./cloneRequest");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class JoinRequestPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, target) {
		this.source = source;
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("JoinRequestPlugin", (request, resolveContext, callback) => {
				const requestPath = /** @type {string} */ (request.path);
				const requestRequest = /** @type {string} */ (request.request);
				const obj = cloneRequest(request);
				obj.path = resolver.join(requestPath, requestRequest);
				obj.relativePath =
					request.relativePath &&
					resolver.join(request.relativePath, requestRequest);
				obj.request = undefined;
				resolver.doResolve(target, obj, null, resolveContext, callback);
			});
	}
};
