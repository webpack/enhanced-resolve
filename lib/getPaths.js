/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");

function isSubDir(parent, dir) {
  const relative = path.relative(parent, dir);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

module.exports = function getPaths(path, jail) {
	const parts = path.split(/(.*?[\\/]+)/);
	const paths = [];
	if (isSubDir(jail, path)) { {
		paths.push(path);
	}
	const seqments = [parts[parts.length - 1]];
	let part = parts[parts.length - 1];
	path = path.substr(0, path.length - part.length - 1);
	for (let i = parts.length - 2; i > 2; i -= 2) {
		paths.push(path);
		part = parts[i];
		path = path.substr(0, path.length - part.length) || "/";
		console.log("path", path);
		seqments.push(part.substr(0, part.length - 1));
	}
	part = parts[1];
	seqments.push(part);
	if (isSubDir(jail, part)) {
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
