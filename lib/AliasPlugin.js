/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const forEachBail = require("./forEachBail");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {{alias: string|Array<string>|false, name: string, onlyModule?: boolean}} AliasOption */

/**
 * @typedef {Object} AliasStrategy
 * @property {string} name
 * @property {(request: ResolveRequest, alias: AliasOption) => boolean} apply should apply alias strategy?
 * @property {(request: ResolveRequest, alias: string, option: AliasOption) => ResolveRequest|undefined} getNewRequest
 */

module.exports = class AliasPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {AliasOption[]} options options
	 * @param {AliasStrategy} strategy alias strategy
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, options, strategy, target) {
		this.source = source;
		this.options = options;
		this.strategy = strategy;
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
			.tapAsync("AliasPlugin", (request, resolveContext, callback) => {
				if (!request.path && !request.request) return callback();
				forEachBail(
					this.options,
					(item, callback) => {
						let shouldStop = false;
						if (this.strategy.apply(request, item)) {
							const resolveWithAlias = (alias, callback) => {
								if (alias === false) {
									const ignoreObj = {
										...request,
										path: false
									};
									return callback(null, ignoreObj);
								}
								const newRequest = this.strategy.getNewRequest(
									request,
									alias,
									item
								);
								if (newRequest !== undefined) {
									shouldStop = true;
									return resolver.doResolve(
										target,
										newRequest,
										`aliased using ${this.strategy.name} strategy with mapping '${item.name}': '${alias}' to '${newRequest.path}'+'${newRequest.request}'`,
										resolveContext,
										(err, result) => {
											if (err) return callback(err);
											if (result) return callback(null, result);
											return callback();
										}
									);
								}
								return callback();
							};
							const stoppingCallback = (err, result) => {
								if (err) return callback(err);

								if (result) return callback(null, result);
								// Don't allow other aliasing or raw request
								if (shouldStop) return callback(null, null);
								return callback();
							};
							if (Array.isArray(item.alias)) {
								return forEachBail(
									item.alias,
									resolveWithAlias,
									stoppingCallback
								);
							} else {
								return resolveWithAlias(item.alias, stoppingCallback);
							}
						}
						return callback();
					},
					callback
				);
			});
	}
};

/**
 * @param {string} name name
 * @param {(request: ResolveRequest, alias: AliasOption) => boolean} apply apply callback
 * @param {(request: ResolveRequest, alias: string, option: AliasOption) => ResolveRequest|undefined} getNewRequest getRequest callback
 * @returns {AliasStrategy} strategy
 */
module.exports.createAliasStrategy = function createAliasStrategy(
	name,
	apply,
	getNewRequest
) {
	return {
		name,
		apply,
		getNewRequest
	};
};
