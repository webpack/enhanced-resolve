/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const DescriptionFileUtils = require("./DescriptionFileUtils");
const forEachBailPromise = require("./forEachBailPromise");
const { processImportsField } = require("./util/entrypoints");
const { parseIdentifier } = require("./util/identifier");
const {
	deprecatedInvalidSegmentRegEx,
	invalidSegmentRegEx,
} = require("./util/path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").JsonObject} JsonObject */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./util/entrypoints").FieldProcessor} FieldProcessor */
/** @typedef {import("./util/entrypoints").ImportsField} ImportsField */

const dotCode = ".".charCodeAt(0);

module.exports = class ImportsFieldPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {Set<string>} conditionNames condition names
	 * @param {string | string[]} fieldNamePath name path
	 * @param {string | ResolveStepHook} targetFile target file
	 * @param {string | ResolveStepHook} targetPackage target package
	 */
	constructor(
		source,
		conditionNames,
		fieldNamePath,
		targetFile,
		targetPackage,
	) {
		this.source = source;
		this.targetFile = targetFile;
		this.targetPackage = targetPackage;
		this.conditionNames = conditionNames;
		this.fieldName = fieldNamePath;
		/** @type {WeakMap<JsonObject, FieldProcessor>} */
		this.fieldProcessorCache = new WeakMap();
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const targetFile = resolver.ensureHook(this.targetFile);
		const targetPackage = resolver.ensureHook(this.targetPackage);

		resolver
			.getHook(this.source)
			.tapPromise("ImportsFieldPlugin", async (request, resolveContext) => {
				// When there is no description file, abort
				if (!request.descriptionFilePath || request.request === undefined) {
					return undefined;
				}

				const remainingRequest =
					request.request + request.query + request.fragment;
				const importsField =
					/** @type {ImportsField | null | undefined} */
					(
						DescriptionFileUtils.getField(
							/** @type {JsonObject} */ (request.descriptionFileData),
							this.fieldName,
						)
					);
				if (!importsField) return undefined;

				if (request.directory) {
					throw new Error(
						`Resolving to directories is not possible with the imports field (request was ${remainingRequest}/)`,
					);
				}

				/** @type {string[]} */
				let paths;
				/** @type {string | null} */
				let usedField;

				try {
					// We attach the cache to the description file instead of the importsField value
					// because we use a WeakMap and the importsField could be a string too.
					// Description file is always an object when exports field can be accessed.
					let fieldProcessor = this.fieldProcessorCache.get(
						/** @type {JsonObject} */ (request.descriptionFileData),
					);
					if (fieldProcessor === undefined) {
						fieldProcessor = processImportsField(importsField);
						this.fieldProcessorCache.set(
							/** @type {JsonObject} */ (request.descriptionFileData),
							fieldProcessor,
						);
					}
					[paths, usedField] = fieldProcessor(
						remainingRequest,
						this.conditionNames,
					);
				} catch (/** @type {unknown} */ err) {
					if (resolveContext.log) {
						resolveContext.log(
							`Imports field in ${request.descriptionFilePath} can't be processed: ${err}`,
						);
					}
					throw /** @type {Error} */ (err);
				}

				if (paths.length === 0) {
					throw new Error(
						`Package import ${remainingRequest} is not imported from package ${request.descriptionFileRoot} (see imports field in ${request.descriptionFilePath})`,
					);
				}

				const result = await forEachBailPromise(paths, async (path, i) => {
					const parsedIdentifier = parseIdentifier(path);

					if (!parsedIdentifier) return undefined;

					const [path_, query, fragment] = parsedIdentifier;

					if (path_.charCodeAt(0) === dotCode) {
						// should be relative
						const withoutDotSlash = path_.slice(2);
						if (
							invalidSegmentRegEx.exec(withoutDotSlash) !== null &&
							deprecatedInvalidSegmentRegEx.test(withoutDotSlash) !== null
						) {
							if (i === paths.length - 1) {
								throw new Error(
									`Invalid "imports" target "${path}" defined for "${usedField}" in the package config ${request.descriptionFilePath}, targets must start with "./"`,
								);
							}

							return undefined;
						}

						/** @type {ResolveRequest} */
						const obj = {
							...request,
							request: undefined,
							path: resolver.join(
								/** @type {string} */ (request.descriptionFileRoot),
								path_,
							),
							relativePath: path_,
							query,
							fragment,
						};

						const resolved = await resolver.doResolve(
							targetFile,
							obj,
							`using imports field: ${path}`,
							resolveContext,
						);
						// Don't allow to continue - https://github.com/webpack/enhanced-resolve/issues/400
						return resolved === undefined ? null : resolved;
					}

					// package resolving
					/** @type {ResolveRequest} */
					const obj = {
						...request,
						request: path_,
						relativePath: path_,
						fullySpecified: true,
						query,
						fragment,
					};

					const resolved = await resolver.doResolve(
						targetPackage,
						obj,
						`using imports field: ${path}`,
						resolveContext,
					);
					// Don't allow to continue - https://github.com/webpack/enhanced-resolve/issues/400
					return resolved === undefined ? null : resolved;
				});

				return result || null;
			});
	}
};
