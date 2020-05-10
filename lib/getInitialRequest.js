/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

module.exports = function getInitialRequest(request) {
	if (typeof request.__initialRequest === "string")
		return request.__initialRequest;

	if (request.request) {
		if (request.directory) {
			return (request.__initialRequest = request.request + "/");
		}

		return (request.__initialRequest = request.request);
	}
};
