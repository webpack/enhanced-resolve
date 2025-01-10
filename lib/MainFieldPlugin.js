/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const DescriptionFileUtils = require("./DescriptionFileUtils");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").JsonObject} JsonObject */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

/** @typedef {{name: string|Array<string>, forceRelative: boolean}} MainFieldOptions */

module.exports = class MainFieldPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {MainFieldOptions} options options
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, options, target) {
		this.source = source;
		this.options = options;
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
			.tapAsync("MainFieldPlugin", (request, resolveContext, callback) => {
				if (
					request.path !== request.descriptionFileRoot ||
					!request.descriptionFilePath ||
					!request.descriptionFileData
				)
					return callback();
				const filename = path.basename(request.descriptionFilePath);
				let mainModule =
					/** @type {string|null|undefined} */
					(
						DescriptionFileUtils.getField(
							request.descriptionFileData,
							this.options.name
						)
					);

				if (
					!mainModule ||
					typeof mainModule !== "string" ||
					mainModule === "." ||
					mainModule === "./"
				) {
					return callback();
				}
				if (this.options.forceRelative && !/^\.\.?\//.test(mainModule))
					mainModule = "./" + mainModule;
				/** @type {ResolveRequest} */
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

					request: mainModule,
					query: request.query,
					fragment: request.fragment,
					module: false,
					directory: mainModule.endsWith("/"),
					file: request.file,
					internal: request.internal
				};
				return resolver.doResolve(
					target,
					obj,
					"use " +
						mainModule +
						" from " +
						this.options.name +
						" in " +
						filename,
					resolveContext,
					callback
				);
			});
	}
};
