"use strict";

/* eslint-disable new-cap */

/**
 * @template {unknown[]} T
 * @typedef {T extends [any, ...infer U] ? U : never} DropFirst
 */

// eslint-disable-next-line jsdoc/no-restricted-syntax
/**
 * @template {Function} T
 * @param {T} fn a function
 * @returns {(this: void, first: string, ...args: Parameters<T>) => ReturnType<T>} a function to make call
 */
function makeCall(fn) {
	return fn.call.bind(fn);
}

const StringPrototypeCharCodeAt = makeCall(String.prototype.charCodeAt);
const StringPrototypeSlice = makeCall(String.prototype.slice);
const StringPrototypeLastIndexOf = makeCall(String.prototype.lastIndexOf);

/**
 * @param {unknown} str string
 * @param {string} name name
 */
function validateString(str, name) {
	if (typeof str !== "string") {
		throw new TypeError(`Expected a string for ${name}`);
	}
}

const CHAR_DOT = 46;
const CHAR_FORWARD_SLASH = 47;
const CHAR_COLON = 58;
const CHAR_BACKWARD_SLASH = 92;

/**
 * @param {number} code code
 * @returns {boolean} true when is path separator, otherwise false
 */
function isPathSeparator(code) {
	return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}

/**
 * @param {number} code code
 * @returns {boolean} true when is posix separator, otherwise false
 */
function isPosixPathSeparator(code) {
	return code === CHAR_FORWARD_SLASH;
}

const CHAR_UPPERCASE_A = 65;
const CHAR_LOWERCASE_A = 97;
const CHAR_UPPERCASE_Z = 90;
const CHAR_LOWERCASE_Z = 122;

/**
 * @param {number} code code
 * @returns {boolean} true when is Windows device root, otherwise false
 */
function isWindowsDeviceRoot(code) {
	return (
		(code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z) ||
		(code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z)
	);
}

/**
 * @param {string} path path
 * @param {boolean} allowAboveRoot allow above root
 * @param {string} separator separator
 * @param {(separator: number) => boolean} isPathSeparator function to check is path separator
 * @returns {string} normalized string
 */
function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
	let res = "";
	let lastSegmentLength = 0;
	let lastSlash = -1;
	let dots = 0;
	let code = 0;
	for (let i = 0; i <= path.length; ++i) {
		if (i < path.length) code = String.prototype.charCodeAt.call(path, i);
		else if (isPathSeparator(code)) break;
		else code = CHAR_FORWARD_SLASH;

		if (isPathSeparator(code)) {
			if (lastSlash === i - 1 || dots === 1) {
				// NOOP
			} else if (dots === 2) {
				if (
					res.length < 2 ||
					lastSegmentLength !== 2 ||
					StringPrototypeCharCodeAt(res, res.length - 1) !== CHAR_DOT ||
					StringPrototypeCharCodeAt(res, res.length - 2) !== CHAR_DOT
				) {
					if (res.length > 2) {
						const lastSlashIndex = StringPrototypeLastIndexOf(res, separator);
						if (lastSlashIndex === -1) {
							res = "";
							lastSegmentLength = 0;
						} else {
							res = StringPrototypeSlice(res, 0, lastSlashIndex);
							lastSegmentLength =
								res.length - 1 - StringPrototypeLastIndexOf(res, separator);
						}
						lastSlash = i;
						dots = 0;
						continue;
					} else if (res.length !== 0) {
						res = "";
						lastSegmentLength = 0;
						lastSlash = i;
						dots = 0;
						continue;
					}
				}
				if (allowAboveRoot) {
					res += res.length > 0 ? `${separator}..` : "..";
					lastSegmentLength = 2;
				}
			} else {
				if (res.length > 0) {
					res += `${separator}${StringPrototypeSlice(path, lastSlash + 1, i)}`;
				} else {
					res = StringPrototypeSlice(path, lastSlash + 1, i);
				}
				lastSegmentLength = i - lastSlash - 1;
			}
			lastSlash = i;
			dots = 0;
		} else if (code === CHAR_DOT && dots !== -1) {
			++dots;
		} else {
			dots = -1;
		}
	}
	return res;
}

const win32 = {
	/**
	 * @param {string} path path
	 * @returns {string} normalized path
	 */
	normalize(path) {
		validateString(path, "path");
		const len = path.length;
		if (len === 0) return ".";
		let rootEnd = 0;
		let device;
		let isAbsolute = false;
		const code = StringPrototypeCharCodeAt(path, 0);

		// Try to match a root
		if (len === 1) {
			// `path` contains just a single char, exit early to avoid
			// unnecessary work
			return isPosixPathSeparator(code) ? "\\" : path;
		}
		if (isPathSeparator(code)) {
			// Possible UNC root

			// If we started with a separator, we know we at least have an absolute
			// path of some kind (UNC or otherwise)
			isAbsolute = true;

			if (isPathSeparator(StringPrototypeCharCodeAt(path, 1))) {
				// Matched double path separator at beginning
				let j = 2;
				let last = j;
				// Match 1 or more non-path separators
				while (
					j < len &&
					!isPathSeparator(StringPrototypeCharCodeAt(path, j))
				) {
					j++;
				}
				if (j < len && j !== last) {
					const firstPart = StringPrototypeSlice(path, last, j);
					// Matched!
					last = j;
					// Match 1 or more path separators
					while (
						j < len &&
						isPathSeparator(StringPrototypeCharCodeAt(path, j))
					) {
						j++;
					}
					if (j < len && j !== last) {
						// Matched!
						last = j;
						// Match 1 or more non-path separators
						while (
							j < len &&
							!isPathSeparator(StringPrototypeCharCodeAt(path, j))
						) {
							j++;
						}
						if (j === len) {
							// We matched a UNC root only
							// Return the normalized version of the UNC root since there
							// is nothing left to process
							return `\\\\${firstPart}\\${StringPrototypeSlice(path, last)}\\`;
						}
						if (j !== last) {
							// We matched a UNC root with leftovers
							device = `\\\\${firstPart}\\${StringPrototypeSlice(
								path,
								last,
								j,
							)}`;
							rootEnd = j;
						}
					}
				}
			} else {
				rootEnd = 1;
			}
		} else if (
			isWindowsDeviceRoot(code) &&
			StringPrototypeCharCodeAt(path, 1) === CHAR_COLON
		) {
			// Possible device root
			device = StringPrototypeSlice(path, 0, 2);
			rootEnd = 2;
			if (len > 2 && isPathSeparator(StringPrototypeCharCodeAt(path, 2))) {
				// Treat separator following drive name as an absolute path
				// indicator
				isAbsolute = true;
				rootEnd = 3;
			}
		}

		let tail =
			rootEnd < len
				? normalizeString(
						StringPrototypeSlice(path, rootEnd),
						!isAbsolute,
						"\\",
						isPathSeparator,
					)
				: "";
		if (tail.length === 0 && !isAbsolute) tail = ".";
		if (
			tail.length > 0 &&
			isPathSeparator(StringPrototypeCharCodeAt(path, len - 1))
		) {
			tail += "\\";
		}
		if (device === undefined) {
			return isAbsolute ? `\\${tail}` : tail;
		}
		return isAbsolute ? `${device}\\${tail}` : `${device}${tail}`;
	},
};

const posix = {
	/**
	 * @param {string} path path
	 * @returns {string} normalized path
	 */
	normalize(path) {
		validateString(path, "path");

		if (path.length === 0) return ".";

		const isAbsolute =
			StringPrototypeCharCodeAt(path, 0) === CHAR_FORWARD_SLASH;
		const trailingSeparator =
			StringPrototypeCharCodeAt(path, path.length - 1) === CHAR_FORWARD_SLASH;

		// Normalize the path
		path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);

		if (path.length === 0) {
			if (isAbsolute) return "/";
			return trailingSeparator ? "./" : ".";
		}
		if (trailingSeparator) path += "/";

		return isAbsolute ? `/${path}` : path;
	},
};

const mod = {
	win32,
	posix,
};

module.exports = mod;
