/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { createAliasStrategy } = require("./AliasPlugin");

module.exports = createAliasStrategy(
	"AliasOption",
	(request, { name, onlyModule }) => {
		const innerRequest = request.request || request.path;
		return innerRequest
			? innerRequest === name ||
					(!onlyModule && innerRequest.startsWith(name + "/"))
			: false;
	},
	(request, alias, { name }) => {
		const innerRequest =
			/** @type {string} */ (request.request || request.path);

		if (innerRequest !== alias && !innerRequest.startsWith(alias + "/")) {
			const remainingRequest = innerRequest.substr(name.length);
			const newRequestStr = alias + remainingRequest;
			return {
				...request,
				request: newRequestStr,
				fullySpecified: false
			};
		}

		return undefined;
	}
);
