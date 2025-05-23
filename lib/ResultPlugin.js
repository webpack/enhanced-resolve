/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class ResultPlugin {
	/**
	 * @param {ResolveStepHook} source source
	 */
	constructor(source) {
		this.source = source;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		this.source.tapAsync(
			"ResultPlugin",
			(request, resolverContext, callback) => {
				const obj = {
					path: request.path,
					context: request.context,
					descriptionFilePath: request.descriptionFilePath,
					descriptionFileRoot: request.descriptionFileRoot,
					descriptionFileData: request.descriptionFileData,
					relativePath: request.relativePath,
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
				if (resolverContext.log)
					resolverContext.log("reporting result " + obj.path);
				resolver.hooks.result.callAsync(obj, resolverContext, (err) => {
					if (err) return callback(err);
					if (typeof resolverContext.yield === "function") {
						resolverContext.yield(obj);
						callback(null, null);
					} else {
						callback(null, obj);
					}
				});
			}
		);
	}
};
