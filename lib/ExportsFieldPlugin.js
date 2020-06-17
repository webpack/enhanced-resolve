/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const path = require("path");
const DescriptionFileUtils = require("./DescriptionFileUtils");
const forEachBail = require("./forEachBail");
const { checkExportsFieldTarget } = require("./pathUtils");
const processExportsField = require("./processExportsField");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./processExportsField").ExportsField} ExportsField */
/** @typedef {import("./processExportsField").ExportsFieldProcessor} ExportsFieldProcessor */

module.exports = class ExportsFieldPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {Set<string>} conditionNames condition names
	 * @param {string | string[]} fieldNamePath name path
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, conditionNames, fieldNamePath, target) {
		this.source = source;
		this.target = target;
		this.conditionNames = conditionNames;
		this.fieldName = fieldNamePath;
		/** @type {WeakMap<any, ExportsFieldProcessor>} */
		this.exportsFieldProcessorCache = new WeakMap();
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("ExportsFieldPlugin", (request, resolveContext, callback) => {
				// When there is no description file, abort
				if (!request.descriptionFilePath) return callback();
				if (
					// When the description file is inherited from parent, abort
					// (There is no description file inside of this package)
					request.relativePath !== "." ||
					request.request === undefined
				)
					return callback();

				const remainingRequest =
					request.query || request.fragment
						? (request.request === "." ? "./" : request.request) +
						  request.query +
						  request.fragment
						: request.request;
				/** @type {ExportsField|null} */
				const exportsField = DescriptionFileUtils.getField(
					request.descriptionFileData,
					this.fieldName
				);
				if (!exportsField) return callback();

				if (request.directory) {
					return callback(
						new Error(
							`Resolving to directories is not possible with the exports field (request was ${remainingRequest}/)`
						)
					);
				}

				let paths;

				try {
					// We attach the cache to the description file instead of the exportsField value
					// because we use a WeakMap and the exportsField could be a string too.
					// Description file is always an object when exports field can be accessed.
					let exportFieldProcessor = this.exportsFieldProcessorCache.get(
						request.descriptionFileData
					);
					if (exportFieldProcessor === undefined) {
						exportFieldProcessor = processExportsField(exportsField);
						this.exportsFieldProcessorCache.set(
							request.descriptionFileData,
							exportFieldProcessor
						);
					}
					paths = exportFieldProcessor(remainingRequest, this.conditionNames);
				} catch (err) {
					if (resolveContext.log) {
						resolveContext.log(
							`Exports field in ${request.descriptionFilePath} can't be processed: ${err}`
						);
					}
					return callback(err);
				}

				if (paths.length === 0) {
					return callback(
						new Error(
							`Package path ${remainingRequest} is not exported from package ${request.descriptionFileRoot} (see exports field in ${request.descriptionFilePath})`
						)
					);
				}

				forEachBail(
					paths,
					(p, callback) => {
						const match = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(p);

						if (!match) return callback();

						const [, relativePath, query, fragment] = match;

						const error = checkExportsFieldTarget(relativePath);

						if (error) {
							return callback(error);
						}

						const obj = {
							...request,
							request: undefined,
							path: path.join(
								/** @type {string} */ (request.descriptionFileRoot),
								relativePath
							),
							relativePath,
							query: query || "",
							fragment: fragment || ""
						};

						resolver.doResolve(
							target,
							obj,
							"using exports field: " + p,
							resolveContext,
							callback
						);
					},
					(err, result) => callback(err, result || null)
				);
			});
	}
};
