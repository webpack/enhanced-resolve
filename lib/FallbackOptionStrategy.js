/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { createAliasStrategy } = require("./AliasPlugin");

module.exports = createAliasStrategy(
	"FallbackOption",
	(request, { name, onlyModule }) => {
		const path = request.path;

		if (!path) return false;

		return path !== name
			? onlyModule
				? request.request === "." && path.endsWith(name) // should end with alias and no remaining request exist
				: path.endsWith(name)
			: true; // exact match
	},
	(request, alias, { name }) => {
		const path = /** @type {string} */ (request.path);
		const i = path.length - name.length;
		const aliasedPart = path.substr(i);

		if (aliasedPart !== alias) {
			const start = path.substr(0, i);
			const newPath = start + alias;
			return {
				...request,
				path: newPath,
				fullySpecified: false
			};
		}

		return undefined;
	}
);
