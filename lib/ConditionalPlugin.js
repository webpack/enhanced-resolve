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
	 * @param {Partial<ResolveRequest>} test compare object
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
		const keys = /** @type {(keyof ResolveRequest)[]} */ (Object.keys(test));
		resolver
			.getHook(this.source)
			.tapPromise("ConditionalPlugin", async (request, resolveContext) => {
				for (const prop of keys) {
					if (request[prop] !== test[prop]) return undefined;
				}
				const result = await resolver.doResolve(
					target,
					request,
					message,
					resolveContext,
				);
				if (allowAlternatives) return result;
				// Don't allow other alternatives
				return result === undefined ? null : result;
			});
	}
};
