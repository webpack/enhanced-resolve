/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class ModulesInRootPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string} path path
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, path, target) {
		this.source = source;
		this.path = path;
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
			.tapAsync("ModulesInRootPlugin", (request, resolveContext, callback) => {
				/** @type {ResolveRequest} */
				const obj = {
					path: this.path,
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

					request: "./" + request.request,
					query: request.query,
					fragment: request.fragment,
					module: false,
					directory: request.directory,
					file: request.file,
					internal: request.internal
				};
				resolver.doResolve(
					target,
					obj,
					"looking for modules in " + this.path,
					resolveContext,
					callback
				);
			});
	}
};
