/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class ModuleKindPlugin {
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
			.tapAsync("ModuleKindPlugin", (request, resolveContext, callback) => {
				if (!request.module) return callback();
				resolver.doResolve(
					target,
					request,
					"resolve as module",
					resolveContext,
					(err, result) => {
						if (err) return callback(err);

						// Don't allow other alternatives
						if (result === undefined) return callback(null, null);
						callback(null, result);
					}
				);
			});
	}
};
