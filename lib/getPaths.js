/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const nodePath = require("path");

/**
 * @param {string} path path
 * @returns {{paths: string[], segments: string[]}}} paths and segments
 */
module.exports = function getPaths(path) {
	if (path === nodePath.sep) return { paths: [nodePath.sep], segments: [""] };
	const parts = path.split(/(.*?[\\/]+)/);
	const paths = [path];
	const segments = [parts[parts.length - 1]];
	let part = parts[parts.length - 1];
	path = path.substring(0, path.length - part.length - 1);
	for (let i = parts.length - 2; i > 2; i -= 2) {
		paths.push(path);
		part = parts[i];
		path = path.substring(0, path.length - part.length) || nodePath.sep;
		segments.push(part.slice(0, -1));
	}
	part = parts[1];
	segments.push(part);
	paths.push(part);
	return {
		paths: paths,
		segments: segments
	};
};

/**
 * @param {string} path path
 * @returns {string|null} basename or null
 */
module.exports.basename = function basename(path) {
	const i = path.lastIndexOf(nodePath.sep);
	if (i < 0) return null;
	const s = path.slice(i + 1);
	return s;
};
