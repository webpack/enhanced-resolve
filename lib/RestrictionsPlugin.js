/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { PathType, getType, normalize } = require("./util/path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

/**
 * @typedef {object} PathRestriction
 * @property {"path"} type type of the restriction
 * @property {string} rule normalized path the request has to be inside of
 * @property {boolean} windowsStyle whether `\` separates segments in `rule`
 */

/**
 * @typedef {object} RegExpRestriction
 * @property {"regexp"} type type of the restriction
 * @property {RegExp} rule pattern the request has to match
 */

/** @typedef {PathRestriction | RegExpRestriction} Restriction */

const slashCode = "/".charCodeAt(0);
const backslashCode = "\\".charCodeAt(0);

/**
 * Whether `\` separates segments in this path, which is true for Windows paths
 * (`C:\a`, `\\server\share`) and false elsewhere, where `\` is an ordinary
 * filename character. The flavor comes from the path itself and never from the
 * host: this package normalizes and joins Windows paths on posix (and runs in
 * browsers), so `path.sep` would be the wrong signal here.
 * @param {string} path path
 * @returns {boolean} true, when `\` separates segments
 */
const isWindowsStyle = (path) =>
	path.includes("\\") || getType(path) === PathType.AbsoluteWin;

/**
 * @param {number} charCode char code
 * @param {boolean} windowsStyle whether `\` separates segments
 * @returns {boolean} true, when the char code separates path segments
 */
const isSeparator = (charCode, windowsStyle) =>
	charCode === slashCode || (windowsStyle && charCode === backslashCode);

/**
 * Windows accepts `/` and `\` interchangeably and mixed within one path, so
 * `C:\a\b`, `C:/a/b` and `C:\a/b` all name the same directory and must all
 * match each other. Elsewhere only an exact prefix is a prefix.
 * @param {string} path path
 * @param {string} parent parent path
 * @param {boolean} windowsStyle whether `\` separates segments in `parent`
 * @returns {boolean} true, if path starts with parent
 */
const startsWithPath = (path, parent, windowsStyle) => {
	if (path.startsWith(parent)) return true;
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
 * @param {string} parent parent path
 * @param {boolean} windowsStyle whether `\` separates segments in `parent`
 * @returns {boolean} true, if path is inside of parent
 */
const isInside = (path, parent, windowsStyle) => {
	if (!startsWithPath(path, parent, windowsStyle)) return false;
	if (path.length === parent.length) return true;
	// A parent ending with a separator (`/`, `/a/b/`, `C:\`) already ends at a
	// segment boundary, otherwise the next character has to be that boundary so
	// that `/a/b` does not contain the sibling `/a/b-other`.
	if (isSeparator(parent.charCodeAt(parent.length - 1), windowsStyle)) {
		return true;
	}
	return isSeparator(path.charCodeAt(parent.length), windowsStyle);
};

module.exports = class RestrictionsPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {Set<string | RegExp>} restrictions restrictions
	 */
	constructor(source, restrictions) {
		this.source = source;
		this.restrictions = restrictions;
		// Restrictions never change, so normalizing them into the shape requests
		// arrive in is done once here instead of on every request.
		/** @type {Restriction[]} */
		this._restrictions = [];
		for (const rule of restrictions) {
			if (typeof rule === "string") {
				const path = normalize(rule);
				this._restrictions.push({
					type: "path",
					rule: path,
					windowsStyle: isWindowsStyle(path),
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
							if (isInside(path, restriction.rule, restriction.windowsStyle)) {
								continue;
							}
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
