/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { posix, win32 } = require("path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

/**
 * @typedef {object} PathRestriction
 * @property {"path"} type type of the restriction
 * @property {string} rule normalized restriction, used for logging
 * @property {string} parent `rule` without a trailing separator
 * @property {string} parentLower lowercased `parent`
 * @property {boolean} windowsStyle whether `parent` is a Windows path
 */

/**
 * @typedef {object} RegExpRestriction
 * @property {"regexp"} type type of the restriction
 * @property {RegExp} rule pattern the request has to match
 */

/** @typedef {PathRestriction | RegExpRestriction} Restriction */

const slashCode = "/".charCodeAt(0);
const backslashCode = "\\".charCodeAt(0);
const colonCode = ":".charCodeAt(0);
const upperACode = "A".charCodeAt(0);
const upperZCode = "Z".charCodeAt(0);
const lowerACode = "a".charCodeAt(0);
const lowerZCode = "z".charCodeAt(0);

/**
 * Whether this is a Windows path, in which `/` and `\` are interchangeable and
 * comparison is case-insensitive, as opposed to a posix path, in which `\` is
 * an ordinary filename character. Decided by the root — a drive letter or a
 * leading `\` — which is where `path.win32` and `path.posix` disagree about
 * `parse(path).root`, and never by the host platform, since this package
 * resolves Windows paths on posix hosts and runs in browsers. A path starting
 * with `//` stays posix: `path.win32` reads it as a UNC root, but here it is
 * indistinguishable from a posix path, where `\` has to keep being a filename
 * character.
 * @param {string} path path
 * @returns {boolean} true, when the path is a Windows path
 */
const isWindowsPath = (path) => {
	const charCode = path.charCodeAt(0);
	if (charCode === backslashCode) return true;
	if (path.charCodeAt(1) !== colonCode) return false;
	return (
		(charCode >= upperACode && charCode <= upperZCode) ||
		(charCode >= lowerACode && charCode <= lowerZCode)
	);
};

/**
 * @param {number} charCode char code
 * @param {boolean} windowsStyle whether `\` separates segments
 * @returns {boolean} true, when the char code separates path segments
 */
const isSeparator = (charCode, windowsStyle) =>
	charCode === slashCode || (windowsStyle && charCode === backslashCode);

/**
 * @param {string} path path
 * @param {boolean} windowsStyle whether `\` separates segments in `path`
 * @returns {string} path without its trailing separators
 */
const trimTrailingSeparators = (path, windowsStyle) => {
	let end = path.length;
	while (end > 0 && isSeparator(path.charCodeAt(end - 1), windowsStyle)) end--;
	return end === path.length ? path : path.slice(0, end);
};

/**
 * @param {string} path path
 * @param {string} parent parent path
 * @param {boolean} windowsStyle whether `\` separates segments in `parent`
 * @returns {boolean} true, if path starts with parent
 */
const startsWithPath = (path, parent, windowsStyle) => {
	if (path.startsWith(parent)) return true;
	// Windows mixes both separators freely, so `C:\a\b`, `C:/a/b` and `C:\a/b`
	// all name the same directory
	if (!windowsStyle || path.length < parent.length) return false;
	for (let i = 0; i < parent.length; i++) {
		const charCode = path.charCodeAt(i);
		const parentCharCode = parent.charCodeAt(i);
		if (charCode === parentCharCode) continue;
		if (!isSeparator(charCode, true) || !isSeparator(parentCharCode, true)) {
			return false;
		}
	}
	return true;
};

/**
 * @param {string} path path
 * @param {string} parent parent path without a trailing separator
 * @param {boolean} windowsStyle whether `\` separates segments in `parent`
 * @returns {boolean} true, if path is inside of parent
 */
const isInside = (path, parent, windowsStyle) => {
	if (!startsWithPath(path, parent, windowsStyle)) return false;
	// the restricted directory itself, or a segment boundary right after it, so
	// that `/a/b` does not contain the sibling `/a/b-other`
	return (
		path.length === parent.length ||
		isSeparator(path.charCodeAt(parent.length), windowsStyle)
	);
};

/**
 * @param {string} path path
 * @param {PathRestriction} restriction restriction
 * @returns {boolean} true, if path is inside of the restriction
 */
const isInsideRestriction = (path, restriction) =>
	isInside(path, restriction.parent, restriction.windowsStyle) ||
	// Windows compares paths case-insensitively, like `path.win32` does. Only
	// reached when the exact comparison already failed.
	(restriction.windowsStyle &&
		isInside(path.toLowerCase(), restriction.parentLower, true));

module.exports = class RestrictionsPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {Set<string | RegExp>} restrictions restrictions
	 */
	constructor(source, restrictions) {
		this.source = source;
		this.restrictions = restrictions;
		// Restrictions never change, so bringing them into the shape requests
		// arrive in is done once here instead of on every request.
		/** @type {Restriction[]} */
		this._restrictions = [];
		for (const rule of restrictions) {
			if (typeof rule === "string") {
				const windowsStyle = isWindowsPath(rule);
				const normalized =
					rule === "" ? rule : (windowsStyle ? win32 : posix).normalize(rule);
				const parent = trimTrailingSeparators(normalized, windowsStyle);
				this._restrictions.push({
					type: "path",
					rule: normalized,
					parent,
					parentLower: parent.toLowerCase(),
					windowsStyle,
				});
			} else {
				this._restrictions.push({ type: "regexp", rule });
			}
		}
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		resolver
			.getHook(this.source)
			.tapAsync("RestrictionsPlugin", (request, resolveContext, callback) => {
				if (typeof request.path === "string") {
					const { path } = request;
					for (const restriction of this._restrictions) {
						if (restriction.type === "path") {
							if (isInsideRestriction(path, restriction)) continue;
							if (resolveContext.log) {
								resolveContext.log(
									`${path} is not inside of the restriction ${restriction.rule}`,
								);
							}
						} else {
							if (restriction.rule.test(path)) continue;
							if (resolveContext.log) {
								resolveContext.log(
									`${path} doesn't match the restriction ${restriction.rule}`,
								);
							}
						}
						// Target existed (FileExistsPlugin already passed) but is
						// outside the jail; signal ExportsFieldPlugin to fall back.
						if (request.__restrictionsMarker) {
							request.__restrictionsMarker.blocked = true;
						}
						return callback(null, null);
					}
				}

				callback();
			});
	}
};
