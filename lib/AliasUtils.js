/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const forEachBail = require("./forEachBail");
const { PathType, getType } = require("./util/path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveContext} ResolveContext */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./Resolver").ResolveCallback} ResolveCallback */
/** @typedef {string | string[] | false} Alias */
/** @typedef {{ alias: Alias, name: string, onlyModule?: boolean }} AliasOption */

/**
 * @typedef {object} CompiledAliasOption
 * @property {string} name original alias name
 * @property {string} nameWithSlash name + "/" — precomputed to avoid per-resolve concat
 * @property {Alias} alias alias target(s)
 * @property {boolean} onlyModule normalized onlyModule flag
 * @property {string | null} absolutePath absolute form of `name` (with slash ending), null when not absolute
 * @property {string | null} wildcardPrefix substring before the single "*" in `name`, null when no wildcard
 * @property {string | null} wildcardSuffix substring after the single "*" in `name`, null when no wildcard
 */

/**
 * Precompute per-option strings used on every resolve so the hot path in
 * `aliasResolveHandler` does no string concatenation / split work per entry.
 * @param {Resolver} resolver resolver
 * @param {AliasOption[]} options options
 * @returns {CompiledAliasOption[]} compiled options
 */
function compileAliasOptions(resolver, options) {
	const result = Array.from({ length: options.length });
	for (let i = 0; i < options.length; i++) {
		const item = options[i];
		const { name } = item;
		let absolutePath = null;
		const type = getType(name);
		if (type === PathType.AbsolutePosix || type === PathType.AbsoluteWin) {
			absolutePath = resolver.join(name, "_").slice(0, -1);
		}
		const firstStar = name.indexOf("*");
		let wildcardPrefix = null;
		let wildcardSuffix = null;
		if (firstStar !== -1 && !name.includes("*", firstStar + 1)) {
			wildcardPrefix = name.slice(0, firstStar);
			wildcardSuffix = name.slice(firstStar + 1);
		}
		result[i] = {
			name,
			nameWithSlash: `${name}/`,
			alias: item.alias,
			onlyModule: Boolean(item.onlyModule),
			absolutePath,
			wildcardPrefix,
			wildcardSuffix,
		};
	}
	return result;
}

/** @typedef {(err?: null | Error, result?: null | ResolveRequest) => void} InnerCallback */
/**
 * @param {Resolver} resolver resolver
 * @param {CompiledAliasOption[]} options compiled options
 * @param {ResolveStepHook} target target
 * @param {ResolveRequest} request request
 * @param {ResolveContext} resolveContext resolve context
 * @param {InnerCallback} callback callback
 * @returns {void}
 */
function aliasResolveHandler(
	resolver,
	options,
	target,
	request,
	resolveContext,
	callback,
) {
	const innerRequest = request.request || request.path;
	if (!innerRequest) return callback();

	const hasRequest = Boolean(request.request);

	forEachBail(
		options,
		(item, callback) => {
			/** @type {boolean} */
			let shouldStop = false;

			const matchRequest =
				innerRequest === item.name ||
				(!item.onlyModule &&
					(hasRequest
						? innerRequest.startsWith(item.nameWithSlash)
						: item.absolutePath !== null &&
							innerRequest.startsWith(item.absolutePath)));

			const matchWildcard = !item.onlyModule && item.wildcardPrefix !== null;

			if (matchRequest || matchWildcard) {
				/**
				 * @param {Alias} alias alias
				 * @param {(err?: null | Error, result?: null | ResolveRequest) => void} callback callback
				 * @returns {void}
				 */
				const resolveWithAlias = (alias, callback) => {
					if (alias === false) {
						/** @type {ResolveRequest} */
						const ignoreObj = {
							...request,
							path: false,
						};
						if (typeof resolveContext.yield === "function") {
							resolveContext.yield(ignoreObj);
							return callback(null, null);
						}
						return callback(null, ignoreObj);
					}

					let newRequestStr;

					if (
						matchWildcard &&
						innerRequest.startsWith(
							/** @type {string} */ (item.wildcardPrefix),
						) &&
						innerRequest.endsWith(/** @type {string} */ (item.wildcardSuffix))
					) {
						const match = innerRequest.slice(
							/** @type {string} */ (item.wildcardPrefix).length,
							innerRequest.length -
								/** @type {string} */ (item.wildcardSuffix).length,
						);
						newRequestStr = alias.toString().replace("*", match);
					}

					if (
						matchRequest &&
						innerRequest !== alias &&
						!innerRequest.startsWith(`${alias}/`)
					) {
						/** @type {string} */
						const remainingRequest = innerRequest.slice(item.name.length);
						newRequestStr = alias + remainingRequest;
					}

					if (newRequestStr !== undefined) {
						shouldStop = true;
						/** @type {ResolveRequest} */
						const obj = {
							...request,
							request: newRequestStr,
							fullySpecified: false,
						};
						return resolver.doResolve(
							target,
							obj,
							`aliased with mapping '${item.name}': '${alias}' to '${newRequestStr}'`,
							resolveContext,
							(err, result) => {
								if (err) return callback(err);
								if (result) return callback(null, result);
								return callback();
							},
						);
					}
					return callback();
				};

				/**
				 * @param {(null | Error)=} err error
				 * @param {(null | ResolveRequest)=} result result
				 * @returns {void}
				 */
				const stoppingCallback = (err, result) => {
					if (err) return callback(err);

					if (result) return callback(null, result);
					// Don't allow other aliasing or raw request
					if (shouldStop) return callback(null, null);
					return callback();
				};

				if (Array.isArray(item.alias)) {
					return forEachBail(item.alias, resolveWithAlias, stoppingCallback);
				}
				return resolveWithAlias(item.alias, stoppingCallback);
			}

			return callback();
		},
		callback,
	);
}

module.exports.aliasResolveHandler = aliasResolveHandler;
module.exports.compileAliasOptions = compileAliasOptions;
