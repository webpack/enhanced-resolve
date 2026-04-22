/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const forEachBailPromise = require("./forEachBailPromise");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {{ alias: string | string[], extension: string }} ExtensionAliasOption */

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
		const { extension, alias } = this.options;
		const isAliasString = typeof alias === "string";
		const aliases = isAliasString ? [alias] : alias;
		const lastIndex = aliases.length - 1;
		resolver
			.getHook(this.source)
			.tapPromise("ExtensionAliasPlugin", async (request, resolveContext) => {
				const requestPath = request.request;
				if (!requestPath || !requestPath.endsWith(extension)) return undefined;
				// Hoist the base (everything before the old extension) out of the
				// per-alias `resolve` callback. For an array `alias`, the callback
				// runs once per candidate extension; the base does not change
				// between iterations, so there's no reason to recompute it.
				const requestBase = requestPath.slice(0, -extension.length);
				const result = await forEachBailPromise(
					aliases,
					async (aliasEntry, index) => {
						const newRequest = `${requestBase}${aliasEntry}`;
						// For multi-alias arrays: suppress errors/misses on intermediate
						// attempts and log the failure. The last attempt may still
						// propagate errors.
						const isLast = isAliasString || index === lastIndex;
						try {
							const inner = await resolver.doResolve(
								target,
								{
									...request,
									request: newRequest,
									fullySpecified: true,
								},
								`aliased from extension alias with mapping '${extension}' to '${aliasEntry}'`,
								resolveContext,
							);
							if (inner) return inner;
							if (isLast) return undefined;
							if (resolveContext.log) {
								resolveContext.log(
									`Failed to alias from extension alias with mapping '${extension}' to '${aliasEntry}' for '${newRequest}': ${inner}`,
								);
							}
							return undefined;
						} catch (/** @type {unknown} */ err) {
							if (isLast) throw err;
							if (resolveContext.log) {
								resolveContext.log(
									`Failed to alias from extension alias with mapping '${extension}' to '${aliasEntry}' for '${newRequest}': ${err}`,
								);
							}
							return undefined;
						}
					},
				);
				if (result) return result;
				// Don't allow other aliasing or raw request
				return null;
			});
	}
};
