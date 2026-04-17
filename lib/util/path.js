/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");

const CHAR_HASH = "#".charCodeAt(0);
const CHAR_SLASH = "/".charCodeAt(0);
const CHAR_BACKSLASH = "\\".charCodeAt(0);
const CHAR_A = "A".charCodeAt(0);
const CHAR_Z = "Z".charCodeAt(0);
const CHAR_LOWER_A = "a".charCodeAt(0);
const CHAR_LOWER_Z = "z".charCodeAt(0);
const CHAR_DOT = ".".charCodeAt(0);
const CHAR_COLON = ":".charCodeAt(0);

const posixNormalize = path.posix.normalize;
const winNormalize = path.win32.normalize;

/**
 * @enum {number}
 */
const PathType = Object.freeze({
	Empty: 0,
	Normal: 1,
	Relative: 2,
	AbsoluteWin: 3,
	AbsolutePosix: 4,
	Internal: 5,
});

const deprecatedInvalidSegmentRegEx =
	/(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;

const invalidSegmentRegEx =
	/(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))?(\\|\/|$)/i;

/**
 * @param {string} maybePath a path
 * @returns {PathType} type of path
 */
const getType = (maybePath) => {
	switch (maybePath.length) {
		case 0:
			return PathType.Empty;
		case 1: {
			const c0 = maybePath.charCodeAt(0);
			switch (c0) {
				case CHAR_DOT:
					return PathType.Relative;
				case CHAR_SLASH:
					return PathType.AbsolutePosix;
				case CHAR_HASH:
					return PathType.Internal;
			}
			return PathType.Normal;
		}
		case 2: {
			const c0 = maybePath.charCodeAt(0);
			switch (c0) {
				case CHAR_DOT: {
					const c1 = maybePath.charCodeAt(1);
					switch (c1) {
						case CHAR_DOT:
						case CHAR_SLASH:
							return PathType.Relative;
					}
					return PathType.Normal;
				}
				case CHAR_SLASH:
					return PathType.AbsolutePosix;
				case CHAR_HASH:
					return PathType.Internal;
			}
			const c1 = maybePath.charCodeAt(1);
			if (
				c1 === CHAR_COLON &&
				((c0 >= CHAR_A && c0 <= CHAR_Z) ||
					(c0 >= CHAR_LOWER_A && c0 <= CHAR_LOWER_Z))
			) {
				return PathType.AbsoluteWin;
			}
			return PathType.Normal;
		}
	}
	const c0 = maybePath.charCodeAt(0);
	switch (c0) {
		case CHAR_DOT: {
			const c1 = maybePath.charCodeAt(1);
			switch (c1) {
				case CHAR_SLASH:
					return PathType.Relative;
				case CHAR_DOT: {
					const c2 = maybePath.charCodeAt(2);
					if (c2 === CHAR_SLASH) return PathType.Relative;
					return PathType.Normal;
				}
			}
			return PathType.Normal;
		}
		case CHAR_SLASH:
			return PathType.AbsolutePosix;
		case CHAR_HASH:
			return PathType.Internal;
	}
	const c1 = maybePath.charCodeAt(1);
	if (c1 === CHAR_COLON) {
		const c2 = maybePath.charCodeAt(2);
		if (
			(c2 === CHAR_BACKSLASH || c2 === CHAR_SLASH) &&
			((c0 >= CHAR_A && c0 <= CHAR_Z) ||
				(c0 >= CHAR_LOWER_A && c0 <= CHAR_LOWER_Z))
		) {
			return PathType.AbsoluteWin;
		}
	}
	return PathType.Normal;
};

/**
 * @param {string} maybePath a path
 * @returns {string} the normalized path
 */
const normalize = (maybePath) => {
	switch (getType(maybePath)) {
		case PathType.Empty:
			return maybePath;
		case PathType.AbsoluteWin:
			return winNormalize(maybePath);
		case PathType.Relative: {
			const r = posixNormalize(maybePath);
			return getType(r) === PathType.Relative ? r : `./${r}`;
		}
	}
	return posixNormalize(maybePath);
};

/**
 * @param {string} rootPath the root path
 * @param {string | undefined} request the request path
 * @returns {string} the joined path
 */
const join = (rootPath, request) => {
	if (!request) return normalize(rootPath);
	const requestType = getType(request);
	switch (requestType) {
		case PathType.AbsolutePosix:
			return posixNormalize(request);
		case PathType.AbsoluteWin:
			return winNormalize(request);
	}
	switch (getType(rootPath)) {
		case PathType.Normal:
		case PathType.Relative:
		case PathType.AbsolutePosix:
			return posixNormalize(`${rootPath}/${request}`);
		case PathType.AbsoluteWin:
			return winNormalize(`${rootPath}\\${request}`);
	}
	switch (requestType) {
		case PathType.Empty:
			return rootPath;
		case PathType.Relative: {
			const r = posixNormalize(rootPath);
			return getType(r) === PathType.Relative ? r : `./${r}`;
		}
	}
	return posixNormalize(rootPath);
};

/**
 * @param {string} maybePath a path
 * @returns {string} the directory name
 */
const dirname = (maybePath) => {
	switch (getType(maybePath)) {
		case PathType.AbsoluteWin:
			return path.win32.dirname(maybePath);
	}
	return path.posix.dirname(maybePath);
};

/** @typedef {{ fn: (rootPath: string, request: string) => string, cache: Map<string, Map<string, string | undefined>> }} CachedJoin */

/**
 * @returns {CachedJoin} cached join
 */
const createCachedJoin = () => {
	/** @type {CachedJoin["cache"]} */
	const cache = new Map();
	/** @type {CachedJoin["fn"]} */
	const fn = (rootPath, request) => {
		/** @type {string | undefined} */
		let cacheEntry;
		let inner = cache.get(rootPath);
		if (inner === undefined) {
			cache.set(rootPath, (inner = new Map()));
		} else {
			cacheEntry = inner.get(request);
			if (cacheEntry !== undefined) return cacheEntry;
		}
		cacheEntry = join(rootPath, request);
		inner.set(request, cacheEntry);
		return cacheEntry;
	};
	return { fn, cache };
};

/** @typedef {{ fn: (maybePath: string) => string, cache: Map<string, string> }} CachedDirname */

/**
 * @returns {CachedDirname} cached dirname
 */
const createCachedDirname = () => {
	/** @type {CachedDirname["cache"]} */
	const cache = new Map();
	/** @type {CachedDirname["fn"]} */
	const fn = (maybePath) => {
		const cacheEntry = cache.get(maybePath);
		if (cacheEntry !== undefined) return cacheEntry;
		const result = dirname(maybePath);
		cache.set(maybePath, result);
		return result;
	};
	return { fn, cache };
};

/** @typedef {{ fn: (maybePath: string, suffix?: string) => string, cache: Map<string, Map<string | undefined, string | undefined>> }} CachedBasename */

/**
 * @returns {CachedBasename} cached basename
 */
const createCachedBasename = () => {
	/** @type {CachedBasename["cache"]} */
	const cache = new Map();
	/** @type {CachedBasename["fn"]} */
	const fn = (maybePath, suffix) => {
		/** @type {string | undefined} */
		let cacheEntry;
		let inner = cache.get(maybePath);
		if (inner === undefined) {
			cache.set(maybePath, (inner = new Map()));
		} else {
			cacheEntry = inner.get(suffix);
			if (cacheEntry !== undefined) return cacheEntry;
		}
		cacheEntry = path.basename(maybePath, suffix);
		inner.set(suffix, cacheEntry);
		return cacheEntry;
	};
	return { fn, cache };
};

/**
 * Whether `request` is a relative request — i.e. matches `^\.\.?(?:\/|$)`.
 *
 * This is called on every `doResolve` via `UnsafeCachePlugin` and
 * `getInnerRequest`, so the char-code form is meaningfully faster than the
 * equivalent regex test: no regex state machine, no string object churn.
 * @param {string} request request string
 * @returns {boolean} true if request is relative
 */
const isRelativeRequest = (request) => {
	const len = request.length;
	if (len === 0 || request.charCodeAt(0) !== CHAR_DOT) return false;
	if (len === 1) return true; // "."
	const c1 = request.charCodeAt(1);
	if (c1 === CHAR_SLASH) return true; // "./..."
	if (c1 !== CHAR_DOT) return false; // ".x..."
	if (len === 2) return true; // ".."
	return request.charCodeAt(2) === CHAR_SLASH; // "../..."
};

/**
 * Check if childPath is a subdirectory of parentPath
 * @param {string} parentPath parent directory path
 * @param {string} childPath child path to check
 * @returns {boolean} true if childPath is under parentPath
 */
const isSubPath = (parentPath, childPath) => {
	// Ensure parentPath ends with a separator to avoid false matches
	// e.g., "/app" shouldn't match "/app-other"
	const parentWithSlash =
		parentPath.endsWith("/") || parentPath.endsWith("\\")
			? parentPath
			: normalize(`${parentPath}/`);

	return childPath.startsWith(parentWithSlash);
};

module.exports.PathType = PathType;
module.exports.createCachedBasename = createCachedBasename;
module.exports.createCachedDirname = createCachedDirname;
module.exports.createCachedJoin = createCachedJoin;
module.exports.deprecatedInvalidSegmentRegEx = deprecatedInvalidSegmentRegEx;
module.exports.dirname = dirname;
module.exports.getType = getType;
module.exports.invalidSegmentRegEx = invalidSegmentRegEx;
module.exports.isRelativeRequest = isRelativeRequest;
module.exports.isSubPath = isSubPath;
module.exports.join = join;
module.exports.normalize = normalize;
