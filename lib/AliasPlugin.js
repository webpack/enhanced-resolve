/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {string | string[] | false} Alias */
/** @typedef {{ alias: Alias, name: string, onlyModule?: boolean }} AliasOption */

const { aliasResolveHandler, compileAliasOptions } = require("./AliasUtils");

module.exports = class AliasPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {AliasOption | AliasOption[]} options options
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, options, target) {
		this.source = source;
		this.options = Array.isArray(options) ? options : [options];
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		const compiled = compileAliasOptions(resolver, this.options);

		resolver
			.getHook(this.source)
			.tapAsync("AliasPlugin", (request, resolveContext, callback) => {
				aliasResolveHandler(
					resolver,
					compiled,
					target,
					request,
					resolveContext,
					callback,
				);
			});
	}
};
