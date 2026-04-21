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
		// Precompute keys + values into parallel arrays (rather than reading
		// `test[prop]` on every resolve) and use an indexed `for` loop. The
		// previous `for (const prop of keys)` form had the array-iterator
		// protocol overhead that V8 can't always eliminate, and it did two
		// property reads (`request[prop]`, `test[prop]`) per step. This
		// function is called on every resolve that passes through any
		// `ConditionalPlugin` — e.g. directory / module / fully-specified
		// predicates — so shaving property reads adds up.
		const keys = /** @type {(keyof ResolveRequest)[]} */ (Object.keys(test));
		const values = keys.map((k) => test[k]);
		const nKeys = keys.length;
		resolver
			.getHook(this.source)
			.tapAsync("ConditionalPlugin", (request, resolveContext, callback) => {
				for (let i = 0; i < nKeys; i++) {
					if (request[keys[i]] !== values[i]) return callback();
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
							},
				);
			});
	}
};
