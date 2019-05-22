/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");

const isSubDir = function(parent, dir) {
	const relative = path.relative(parent, dir);
  return relative === "" || (relative && !relative.startsWith('..') && !path.isAbsolute(relative));
};

module.exports = function getPaths(path, jail) {
	const parts = path.split(/(.*?[\\/]+)/);
	const paths = [];
	const seqments = [];
	let part = parts[parts.length - 1];
	if (!jail || (jail && isSubDir(jail, path))) {
		paths.push(path);
		seqments.push(part)
	}
	path = path.substr(0, path.length - part.length - 1);
	for (let i = parts.length - 2; i > 2; i -= 2) {
		part = parts[i];
		if (!jail || (jail && isSubDir(jail, path))) {
			paths.push(path);
			seqments.push(part.substr(0, part.length - 1));
		}
		path = path.substr(0, path.length - part.length) || "/";
	}
	part = parts[1];
	if (!jail || (jail && isSubDir(jail, path))) {
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

module.exports.isSubDir = isSubDir;
