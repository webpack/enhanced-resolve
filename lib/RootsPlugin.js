/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const forEachBail = require("./forEachBail");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

class RootsPlugin {
	/**
	 * @param {string | ResolveStepHook} source source hook
	 * @param {Set<string>} roots roots
	 * @param {string | ResolveStepHook} target target hook
	 */
	constructor(source, roots, target) {
		this.roots = Array.from(roots);
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
			.tapAsync("RootsPlugin", (request, resolveContext, callback) => {
				const req = request.request;
				if (!req) return callback();
				if (!req.startsWith("/")) return callback();

				forEachBail(
					this.roots,
					/**
					 * @param {string} root root
					 * @param {(err?: null|Error, result?: null|ResolveRequest) => void} callback callback
					 * @returns {void}
					 */
					(root, callback) => {
						const path = resolver.join(root, req.slice(1));
						/** @type {ResolveRequest} */
						const obj = {
							path,
							context: request.context,
							descriptionFilePath: request.descriptionFilePath,
							descriptionFileRoot: request.descriptionFileRoot,
							descriptionFileData: request.descriptionFileData,
							relativePath: request.relativePath && path,
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
							`root path ${root}`,
							resolveContext,
							callback
						);
					},
					callback
				);
			});
	}
}

module.exports = RootsPlugin;
