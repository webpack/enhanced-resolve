/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {{ paths: string[], segments: string[] }} GetPathsResult */

const ROOT_RESULT = /** @type {GetPathsResult} */ (
	Object.freeze({
		paths: Object.freeze(["/"]),
		segments: Object.freeze([""]),
	})
);

/**
 * Walk `path` from tip to root, returning every ancestor directory (plus the
 * input itself) in `paths`, and each corresponding segment name in `segments`.
 *
 * This is called once per bare-specifier resolve through
 * `ModulesInHierarchicalDirectoriesPlugin`, so a lot of hot resolves hit it.
 * The result is deterministic per input, so `createCachedGetPaths` (below)
 * memoizes it on the shared `_pathCacheByFs` WeakMap.
 * @param {string} path path
 * @returns {GetPathsResult} paths and segments
 */
function getPaths(path) {
	if (path === "/") return ROOT_RESULT;
	const parts = path.split(/(.*?[\\/]+)/);
	const paths = [path];
	const segments = [parts[parts.length - 1]];
	let part = parts[parts.length - 1];
	path = path.slice(0, Math.max(0, path.length - part.length - 1));
	for (let i = parts.length - 2; i > 2; i -= 2) {
		paths.push(path);
		part = parts[i];
		path = path.slice(0, Math.max(0, path.length - part.length)) || "/";
		segments.push(part.slice(0, -1));
	}
	[, part] = parts;
	segments.push(part);
	paths.push(part);
	return {
		paths,
		segments,
	};
}

/** @typedef {{ fn: (path: string) => GetPathsResult, cache: Map<string, GetPathsResult> }} CachedGetPaths */

/**
 * Build a memoizing wrapper around `getPaths`. The cache is owned by the
 * resolver's per-filesystem `pathCache` (see `Resolver.js`) so multiple
 * resolvers sharing the same filesystem share the precomputed ancestor lists
 * instead of re-running the regex split for every module-lookup.
 *
 * The returned result is shared across callers. Callers in this codebase
 * treat it read-only (the arrays are only iterated).
 * @returns {CachedGetPaths} cached getPaths
 */
const createCachedGetPaths = () => {
	/** @type {CachedGetPaths["cache"]} */
	const cache = new Map();
	/** @type {CachedGetPaths["fn"]} */
	const fn = (inputPath) => {
		const cached = cache.get(inputPath);
		if (cached !== undefined) return cached;
		const result = getPaths(inputPath);
		cache.set(inputPath, result);
		return result;
	};
	return { fn, cache };
};

module.exports = getPaths;
module.exports.createCachedGetPaths = createCachedGetPaths;
