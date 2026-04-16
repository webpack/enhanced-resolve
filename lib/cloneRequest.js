/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */

// The canonical ResolveRequest shape. Writing the clone as an object literal in
// this exact order lets V8 assign a single hidden class to every result,
// dramatically speeding up downstream property accesses on plugin-produced
// requests. Any extra own keys attached by plugin authors (e.g. webpack's
// ResolverCachePlugin) are copied afterwards, at the cost of a shape
// transition on that specific object only.
/**
 * Create a structural copy of a ResolveRequest with a predictable hidden
 * class. Callers are expected to overwrite the few fields they need to
 * change; simple assignment does not alter the shape.
 * @param {ResolveRequest} request source request
 * @returns {ResolveRequest} clone
 */
const cloneRequest = (request) => {
	/** @type {ResolveRequest} */
	const obj = {
		path: request.path,
		context: request.context,
		descriptionFilePath: request.descriptionFilePath,
		descriptionFileRoot: request.descriptionFileRoot,
		descriptionFileData: request.descriptionFileData,
		tsconfigPathsMap: request.tsconfigPathsMap,
		relativePath: request.relativePath,
		ignoreSymlinks: request.ignoreSymlinks,
		fullySpecified: request.fullySpecified,
		__innerRequest: request.__innerRequest,
		// eslint-disable-next-line camelcase
		__innerRequest_request: request.__innerRequest_request,
		// eslint-disable-next-line camelcase
		__innerRequest_relativePath: request.__innerRequest_relativePath,
		request: request.request,
		query: request.query,
		fragment: request.fragment,
		module: request.module,
		directory: request.directory,
		file: request.file,
		internal: request.internal,
	};

	// Preserve any custom own properties a plugin author may have attached to
	// the request. When there are none (the common case) `Object.keys` returns
	// only the standard fields and `in obj` short-circuits the loop body, so
	// the fast shape is retained.
	const keys = Object.keys(request);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (!(key in obj)) {
			/** @type {Record<string, unknown>} */ (obj)[key] =
				/** @type {Record<string, unknown>} */ (request)[key];
		}
	}
	const symbols = Object.getOwnPropertySymbols(request);
	for (let i = 0; i < symbols.length; i++) {
		const sym = symbols[i];
		/** @type {Record<symbol, unknown>} */ (/** @type {unknown} */ (obj))[sym] =
			/** @type {Record<symbol, unknown>} */ (/** @type {unknown} */ (request))[
				sym
			];
	}

	return obj;
};

module.exports = cloneRequest;
