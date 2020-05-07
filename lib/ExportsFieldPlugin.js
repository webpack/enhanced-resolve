/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const path = require("path");
const DescriptionFileUtils = require("./DescriptionFileUtils");
const { checkExportsFieldTarget, getType, PathType } = require("./pathUtils");
const { processExportsField, buildPathTree } = require("./processExportsField");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./processExportsField").ExportsField} ExportsField */
/** @typedef {import("./processExportsField").PathTreeNode} PathTreeNode */

/*
Terminology:

ehnanced-resolve call specifiers like 'some-package' - bare specifier.
They refer to an entry point of a package by the package name.

Deep import specifiers like 'some-package/lib/shuffle.mjs'.
They refer to a path within a package prefixed by the package name.

Relative specifiers like './startup.js' or '../config.mjs'.
They refer to a path relative to the location of the importing file.
*/

const alreadyRequested = Symbol();
const namespacePackageStartCode = "@".charCodeAt(0);

module.exports = class ExportsFieldPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | ResolveStepHook} targetRelativeSpecifier target for relative specifier
	 * @param {string | ResolveStepHook} targetDeepImportOrBareSpecifier target for deep import specifier
	 * @param {string | ResolveStepHook} moduleRequest module request
	 * @param {Set<string>} conditionNames condition names
	 */
	constructor(
		source,
		targetRelativeSpecifier,
		targetDeepImportOrBareSpecifier,
		moduleRequest,
		conditionNames
	) {
		this.source = source;
		this.targetRelativeSpecifier = targetRelativeSpecifier;
		this.targetDeepImportOrBareSpecifier = targetDeepImportOrBareSpecifier;
		this.module = moduleRequest;
		this.conditionNames = conditionNames;
		/** @type {WeakMap<object, PathTreeNode>} */
		this.cache = new WeakMap();
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const targetRelativeSpecifier = resolver.ensureHook(
			this.targetRelativeSpecifier
		);
		const targetDeepImportOrBareSpecifier = resolver.ensureHook(
			this.targetDeepImportOrBareSpecifier
		);
		const moduleHook = resolver.ensureHook(this.module);
		resolver
			.getHook(this.source)
			.tapAsync("ExportFieldPlugin", (request, resolveContext, callback) => {
				/** @type {ExportsField|null} */
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
				let treeRoot = this.cache.get(request.descriptionFileData);

				if (!treeRoot) {
					treeRoot = buildPathTree(exportsField);
					this.cache.set(request.descriptionFileData, treeRoot);
				}

				try {
					paths = processExportsField(
						treeRoot,
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

				function handleResolve(err, result) {
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

				function resolveNext() {
					const p = paths[i];
					const errorMsg = checkExportsFieldTarget(p);

					if (errorMsg) {
						return callback(new Error(errorMsg));
					}

					const isDeepImportOrBareSpecifier = getType(p) === PathType.Normal;
					const target = isDeepImportOrBareSpecifier
						? targetDeepImportOrBareSpecifier
						: targetRelativeSpecifier;

					const obj = {
						...request,
						request: undefined
					};

					if (isDeepImportOrBareSpecifier) {
						obj.path = /** @type {string} */ (request.descriptionFileRoot);
						obj.request = p;
					} else {
						obj.path = path.join(
							/** @type {string} */ (request.descriptionFileRoot),
							p
						);
						obj.relativePath = p;
					}

					resolver.doResolve(
						target,
						obj,
						"exports field: " + paths[i],
						resolveContext,
						handleResolve
					);
				}

				resolveNext();
			});
	}
};
