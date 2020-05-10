/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const path = require("path");
const DescriptionFileUtils = require("./DescriptionFileUtils");
const getInitialRequest = require("./getInitialRequest");
const { checkExportsFieldTarget } = require("./pathUtils");
const createProcessor = require("./processExportsField");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./processExportsField").ExportsField} ExportsField */
/** @typedef {import("./processExportsField").PathTreeNode} PathTreeNode */

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
		this.processExportsField = createProcessor();
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("ExportFieldPlugin", (request, resolveContext, callback) => {
				if (!request.descriptionFilePath) return callback();
				const initialRequest = getInitialRequest(request);
				if (!initialRequest) return callback();
				/** @type {ExportsField|null} */
				const exportsField = DescriptionFileUtils.getField(
					request.descriptionFileData,
					"exports"
				);
				if (!exportsField) return callback();
				const packageName = DescriptionFileUtils.getField(
					request.descriptionFileData,
					"name"
				);

				if (request.directory) {
					const req = initialRequest.slice(2) + "/";
					return callback(
						new Error(`Exports field expects direct module import, got ${req}`)
					);
				}

				const requestStart = "./" + packageName;
				const selfReferenced = initialRequest.startsWith(requestStart);

				if (!selfReferenced) return callback();

				const remainingRequest =
					"." + initialRequest.slice(requestStart.length);

				let paths;

				try {
					paths = this.processExportsField(
						exportsField,
						remainingRequest,
						this.conditionNames
					);
				} catch (err) {
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
						"exports field: " + paths[i],
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
