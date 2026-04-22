/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class ResultPlugin {
	/**
	 * @param {ResolveStepHook} source source
	 */
	constructor(source) {
		this.source = source;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		this.source.tapPromise("ResultPlugin", (request, resolverContext) => {
			const obj = { ...request };
			if (resolverContext.log) {
				resolverContext.log(`reporting result ${obj.path}`);
			}
			return resolver.hooks.result.promise(obj, resolverContext).then(() => {
				if (typeof resolverContext.yield === "function") {
					resolverContext.yield(obj);
					return null;
				}
				return obj;
			});
		});
	}
};
