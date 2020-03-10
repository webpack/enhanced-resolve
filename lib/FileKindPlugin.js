/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class FileKindPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | null} message message
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, message, target) {
		this.source = source;
		this.message = /** @type {string | null} */ (target ? message : null);
		this.target = /** @type {string | ResolveStepHook} */ (target
			? target
			: message);
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("FileKindPlugin", (request, resolveContext, callback) => {
				if (request.directory) return callback();
				resolver.doResolve(
					target,
					request,
					this.message,
					resolveContext,
					callback
				);
			});
	}
};
