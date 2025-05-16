/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const basename = require("./getPaths").basename;

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class CloneBasenamePlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, target) {
		this.source = source;
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("CloneBasenamePlugin", (request, resolveContext, callback) => {
				const requestPath = /** @type {string} */ (request.path);
				const filename = /** @type {string} */ (basename(requestPath));
				const filePath = resolver.join(requestPath, filename);
				/** @type {ResolveRequest} */
				const obj = {
					path: filePath,
					context: request.context,
					descriptionFilePath: request.descriptionFilePath,
					descriptionFileRoot: request.descriptionFileRoot,
					descriptionFileData: request.descriptionFileData,
					relativePath:
						request.relativePath &&
						resolver.join(request.relativePath, filename),
					ignoreSymlinks: request.ignoreSymlinks,
					fullySpecified: request.fullySpecified,
					__innerRequest: request.__innerRequest,
					__innerRequest_request: request.__innerRequest_request,
					__innerRequest_relativePath: request.__innerRequest_relativePath,

					request: request.request,
					query: request.query,
					fragment: request.fragment,
					module: request.module,
					directory: request.directory,
					file: request.file,
					internal: request.internal
				};
				resolver.doResolve(
					target,
					obj,
					"using path: " + filePath,
					resolveContext,
					callback
				);
			});
	}
};
