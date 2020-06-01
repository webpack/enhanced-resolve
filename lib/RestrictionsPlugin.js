/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class RestrictionsPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {Set<string | RegExp>} restrictions restrictions
	 */
	constructor(source, restrictions) {
		this.source = source;
		this.restrictions = restrictions;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		resolver
			.getHook(this.source)
			.tapAsync("RestrictionsPlugin", (request, resolveContext, callback) => {
				if (typeof request.path === "string") {
					const path = request.path;
					for (const rule of this.restrictions) {
						if (typeof rule === "string") {
							if (!path.startsWith(rule)) return callback(null, null);
						} else if (!rule.test(path)) {
							return callback(null, null);
						}
					}
				}

				callback();
			});
	}
};
