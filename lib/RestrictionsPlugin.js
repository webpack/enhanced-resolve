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
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, restrictions, target) {
		this.source = source;
		this.target = target;
		this.restrictions = restrictions;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("RestrictionsPlugin", (request, resolveContext, callback) => {
				if (typeof request.path === "string") {
					const path = request.path;
					for (const rule of this.restrictions) {
						if (typeof rule === "string") {
							if (!path.startsWith(rule))
								return callback(
									new Error(
										`Resolve restriction ${JSON.stringify(rule)} not passed`
									)
								);
						} else if (!rule.test(path)) {
							return callback(
								new Error(`Resolve restriction ${rule.toString()} not passed`)
							);
						}
					}
				}

				resolver.doResolve(
					target,
					request,
					"restrictions passed",
					resolveContext,
					callback
				);
			});
	}
};
