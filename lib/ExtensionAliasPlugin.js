/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const forEachBail = require("./forEachBail");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {{ alias: string|string[], extension: string }} ExtensionAliasOption */

module.exports = class ExtensionAliasPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {ExtensionAliasOption} options options
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, options, target) {
		this.source = source;
		this.options = options;
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		const { extension, alias: aliasArray } = this.options;
		resolver
			.getHook(this.source)
			.tapAsync("ExtensionAliasPlugin", (request, resolveContext, callback) => {
				const requestPath = request.path;
				if (!requestPath || !requestPath.endsWith(extension)) return callback();
				const resolve = (alias, callback) => {
					resolver.doResolve(
						target,
						{
							...request,
							path: `${requestPath.slice(0, -extension.length)}${alias}`,
							relativePath: request.relativePath
								? `${request.relativePath.slice(0, -extension.length)}${alias}`
								: request.relativePath
						},
						`aliased from extension alias with mapping '${extension}' to '${alias}'`,
						resolveContext,
						callback
					);
				};

				if (aliasArray.length > 1) {
					forEachBail(aliasArray, resolve, callback);
				} else {
					resolve(aliasArray[0], callback);
				}
			});
	}
};
