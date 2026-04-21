/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {{ paths: string[], segments: string[] }} GetPathsResult */

/**
 * Walk `path` from tip to root, returning every ancestor directory (plus the
 * input itself) in `paths`, and each corresponding segment name in `segments`.
 *
 * This is called from `ModulesUtils.modulesResolveHandler` (indirectly — via
 * its `_addrsCacheByDirs` cache) and from `SymlinkPlugin` (directly, on every
 * resolve that gets to the `existing-file` hook).
 * @param {string} path path
 * @returns {GetPathsResult} paths and segments
 */
module.exports = function getPaths(path) {
	if (path === "/") return { paths: ["/"], segments: [""] };
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
};
