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
/** @typedef {import("./processExportsField").ExportField} ExportField */

const alreadyRequested = Symbol();
const namespacePackageStartCode = "@".charCodeAt(0);

module.exports = class ExportsFieldPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | ResolveStepHook} target target
	 * @param {string | ResolveStepHook} moduleRequest module request
	 * @param {Set<string>} conditionNames condition names
	 */
	constructor(source, target, moduleRequest, conditionNames) {
		this.source = source;
		this.target = target;
		this.module = moduleRequest;
		this.conditionNames = conditionNames;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		const moduleHook = resolver.ensureHook(this.module);
		resolver
			.getHook(this.source)
			.tapAsync("ExportFieldPlugin", (request, resolveContext, callback) => {
				/** @type {ExportField|null} */
				const exportsField = DescriptionFileUtils.getField(
					request.descriptionFileData,
					"exports"
				);
				if (!request.descriptionFilePath || !exportsField || !request.request)
					return callback();

				const packageName = DescriptionFileUtils.getField(
					request.descriptionFileData,
					"name"
				);

				const requestStart = "./" + packageName;
				const selfReferenced = request.request.startsWith(requestStart);

				if (!selfReferenced) {
					if (request[alreadyRequested]) return callback();

					let slashIndex;

					if (request.request.charCodeAt(2) === namespacePackageStartCode) {
						slashIndex = request.request.indexOf("/", 2);
						slashIndex = request.request.indexOf("/", slashIndex);
					} else {
						slashIndex = request.request.indexOf("/", 2);
					}

					// starts with "./"
					const bareSpecifier =
						slashIndex === -1
							? request.request
							: request.request.slice(0, slashIndex);

					const p =
						path.join(/** @type {string} */ (request.path), bareSpecifier) +
						"/";
					const obj = {
						...request,
						path: p,
						[alreadyRequested]: true
					};
					return resolver.doResolve(
						moduleHook,
						obj,
						"exports field resolve module: " + p,
						resolveContext,
						callback
					);
				}

				if (request.directory) {
					const req = request.request.slice(2) + "/";
					return callback(
						new Error(`Exports field expects direct module import, got ${req}`)
					);
				}

				const remainingRequest =
					"." + request.request.slice(requestStart.length);

				let paths = [];

				try {
					paths = processExportsField(
						exportsField,
						remainingRequest,
						this.conditionNames
					);
				} catch (err) {
					return callback(err);
				}

				if (paths.length === 0) {
					return callback(
						new Error(
							`Unresolved ${path.join(
								/** @type {string} */ (request.path),
								/** @type {string} */ (request.request)
							)}`
						)
					);
				}

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
							if (err || !result) {
								i++;

								if (i === paths.length) {
									callback(err || new Error("Unresolved exports field export"));
								} else {
									resolveNext();
								}

								return;
							}

							callback(null, result);
						}
					);
				};

				resolveNext();
			});
	}
};
