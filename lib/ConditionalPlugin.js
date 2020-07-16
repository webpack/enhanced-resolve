/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class ConditionalPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {Partial<Record<keyof ResolveRequest, boolean>>} test compare object
	 * @param {string | null} message log message
	 * @param {boolean} allowAlternatives when false, do not continue with the current step when "test" matches
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, test, message, allowAlternatives, target) {
		this.source = source;
		this.test = test;
		this.message = message;
		this.allowAlternatives = allowAlternatives;
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		const { test, message, allowAlternatives } = this;
		resolver
			.getHook(this.source)
			.tapAsync("ConditionalPlugin", (request, resolveContext, callback) => {
				for (const prop of Object.keys(test)) {
					if (!request[prop] === test[prop]) return callback();
				}
				resolver.doResolve(
					target,
					request,
					message,
					resolveContext,
					allowAlternatives
						? callback
						: (err, result) => {
								if (err) return callback(err);

								// Don't allow other alternatives
								if (result === undefined) return callback(null, null);
								callback(null, result);
						  }
				);
			});
	}
};
