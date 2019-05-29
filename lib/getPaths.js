/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { sep } = require("path");

module.exports = function getPaths(path, jail) {
	if (jail && !path.startsWith(jail) && path + sep !== jail) {
		return {
			paths: [],
			seqments: []
		};
	}
	const parts = path.split(/(.*?[\\/]+)/);
	let part = parts[parts.length - 1];
	const paths = [path];
	const seqments = [part];
	path = path.substr(0, path.length - part.length - 1);
	for (let i = parts.length - 2; i > 2; i -= 2) {
		part = parts[i];
		// jail always has a trailing / where-as path never has, so account for that.
		if (!jail || path.length + 1 >= jail.length) {
			paths.push(path);
			seqments.push(part.substr(0, part.length - 1));
		} else {
			break;
		}
		path = path.substr(0, path.length - part.length) || "/";
	}
	part = parts[1];
	if (!jail || path.length >= jail.length) {
		seqments.push(part);
		paths.push(part);
	}
	return {
		paths: paths,
		seqments: seqments
	};
};

module.exports.basename = function basename(path) {
	const i = path.lastIndexOf("/"),
		j = path.lastIndexOf("\\");
	const p = i < 0 ? j : j < 0 ? i : i < j ? j : i;
	if (p < 0) return null;
	const s = path.substr(p + 1);
	return s;
};
