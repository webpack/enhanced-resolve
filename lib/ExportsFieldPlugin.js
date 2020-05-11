/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const path = require("path");
const DescriptionFileUtils = require("./DescriptionFileUtils");
const { checkExportsFieldTarget } = require("./pathUtils");
const processExportsField = require("./processExportsField");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./processExportsField").ExportsField} ExportsField */
/** @typedef {import("./processExportsField").ExportsFieldProcessor} ExportsFieldProcessor */

module.exports = class ExportsFieldPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | ResolveStepHook} target target
	 * @param {Set<string>} conditionNames condition names
	 */
	constructor(source, target, conditionNames) {
		this.source = source;
		this.target = target;
		this.conditionNames = conditionNames;
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
				// When the description file is inherited from parent, abort
				// (There is no description file inside of this package)
				if (request.relativePath !== ".") return callback();

				/** @type {ExportsField|null} */
				const exportsField = DescriptionFileUtils.getField(
					request.descriptionFileData,
					"exports"
				);
				if (!exportsField) return callback();

				const remainingRequest = request.request;
				if (remainingRequest === undefined) return callback();

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

				if (paths.length === 0) return callback(null, null);

				let i = 0;

				const resolveNext = () => {
					const errorMsg = checkExportsFieldTarget(paths[i]);

					if (errorMsg) {
						return callback(new Error(errorMsg));
					}

					const obj = {
						...request,
						request: undefined,
						path: path.join(
							/** @type {string} */ (request.descriptionFileRoot),
							paths[i]
						),
						relativePath: paths[i]
					};

					resolver.doResolve(
						target,
						obj,
						"using exports field: " + paths[i],
						resolveContext,
						(err, result) => {
							if (err) {
								i++;

								return i !== paths.length ? resolveNext() : callback(err);
							} else if (result === undefined) {
								i++;

								return i === paths.length
									? callback(null, null)
									: resolveNext();
							}

							callback(null, result);
						}
					);
				};

				resolveNext();
			});
	}
};
