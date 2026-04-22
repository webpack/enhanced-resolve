/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const forEachBailPromise = require("./forEachBailPromise");
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
 * @property {number} firstCharCode first character code of `name` — used as a cheap screen on the hot path. `-1` indicates "matches any first char" (empty wildcard prefix).
 * @property {boolean} arrayAlias true when `alias` is an array — precomputed so the hot path skips `Array.isArray`
 */

const EMPTY_COMPILED_OPTIONS = /** @type {CompiledAliasOption[]} */ ([]);

/**
 * Precompute per-option strings used on every resolve so the hot path in
 * `aliasResolveHandler` does no string concatenation / split work per entry.
 * Called once per plugin apply — the returned array is stable for the
 * lifetime of the resolver.
 * @param {Resolver} resolver resolver
 * @param {AliasOption[]} options options
 * @returns {CompiledAliasOption[]} compiled options
 */
function compileAliasOptions(resolver, options) {
	if (options.length === 0) return EMPTY_COMPILED_OPTIONS;
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
		// firstCharCode: used by `aliasResolveHandler` to quickly skip aliases
		// whose name can't possibly match the current innerRequest. For a plain
		// alias (no wildcard) the first char of the name is also the first char
		// of `nameWithSlash` and of `absolutePath` (since the latter is derived
		// from name via `resolver.join(name, "_")`, which only appends). For a
		// wildcard with a non-empty prefix, the first char of that prefix is
		// also the first char of name. Only the `name === "*"` case (empty
		// wildcard prefix) can match arbitrary first chars — encode that as -1.
		let firstCharCode;
		if (wildcardPrefix !== null && wildcardPrefix.length === 0) {
			firstCharCode = -1;
		} else {
			firstCharCode = name.length > 0 ? name.charCodeAt(0) : -1;
		}
		result[i] = {
			name,
			nameWithSlash: `${name}/`,
			alias: item.alias,
			onlyModule: Boolean(item.onlyModule),
			absolutePath,
			wildcardPrefix,
			wildcardSuffix,
			firstCharCode,
			arrayAlias: Array.isArray(item.alias),
		};
	}
	return result;
}

/**
 * @param {Resolver} resolver resolver
 * @param {CompiledAliasOption[]} options compiled options
 * @param {ResolveStepHook} target target
 * @param {ResolveRequest} request request
 * @param {ResolveContext} resolveContext resolve context
 * @returns {Promise<ResolveRequest | null | undefined>} resolved request
 */
async function aliasResolveHandler(
	resolver,
	options,
	target,
	request,
	resolveContext,
) {
	if (options.length === 0) return undefined;
	const innerRequest = request.request || request.path;
	if (!innerRequest) return undefined;

	// Precompute values used in the inner scan loop so we don't recompute
	// them per option. This is meaningful when `options` has hundreds of
	// entries (e.g. monorepos with generated alias lists) — see the
	// `huge-alias-list` / `huge-alias-miss` benchmarks.
	const innerFirstCharCode = innerRequest.charCodeAt(0);
	const hasRequestString = Boolean(request.request);

	return forEachBailPromise(options, async (item) => {
		// Cheap char-code screen: when the compiled option's first char
		// doesn't match the request's first char (and it isn't an
		// "empty-prefix wildcard" — encoded as -1), this option cannot
		// possibly match, so skip straight away and avoid the
		// `startsWith` / `===` work below.
		const { firstCharCode } = item;
		if (firstCharCode !== -1 && firstCharCode !== innerFirstCharCode) {
			return undefined;
		}

		/** @type {boolean} */
		let shouldStop = false;

		const matchRequest =
			innerRequest === item.name ||
			(!item.onlyModule &&
				(hasRequestString
					? innerRequest.startsWith(item.nameWithSlash)
					: item.absolutePath !== null &&
						innerRequest.startsWith(item.absolutePath)));

		const matchWildcard = !item.onlyModule && item.wildcardPrefix !== null;

		if (!matchRequest && !matchWildcard) return undefined;

		/**
		 * @param {Alias} alias alias
		 * @returns {Promise<ResolveRequest | null | undefined>} result
		 */
		const resolveWithAlias = async (alias) => {
			if (alias === false) {
				/** @type {ResolveRequest} */
				const ignoreObj = {
					...request,
					path: false,
				};
				if (typeof resolveContext.yield === "function") {
					resolveContext.yield(ignoreObj);
					return null;
				}
				return ignoreObj;
			}

			let newRequestStr;

			if (
				matchWildcard &&
				innerRequest.startsWith(/** @type {string} */ (item.wildcardPrefix)) &&
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

			if (newRequestStr === undefined) return undefined;

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
			);
		};

		let result;
		if (item.arrayAlias) {
			result = await forEachBailPromise(
				/** @type {string[]} */ (item.alias),
				resolveWithAlias,
			);
		} else {
			result = await resolveWithAlias(item.alias);
		}

		if (result) return result;
		// Don't allow other aliasing or raw request
		if (shouldStop) return null;
		return undefined;
	});
}

module.exports.aliasResolveHandler = aliasResolveHandler;
module.exports.compileAliasOptions = compileAliasOptions;
