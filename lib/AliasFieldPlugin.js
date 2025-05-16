/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DescriptionFileUtils = require("./DescriptionFileUtils");
const getInnerRequest = require("./getInnerRequest");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").JsonPrimitive} JsonPrimitive */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class AliasFieldPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | Array<string>} field field
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, field, target) {
		this.source = source;
		this.field = field;
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
			.tapAsync("AliasFieldPlugin", (request, resolveContext, callback) => {
				if (!request.descriptionFileData) return callback();
				const innerRequest = getInnerRequest(resolver, request);
				if (!innerRequest) return callback();
				const fieldData = DescriptionFileUtils.getField(
					request.descriptionFileData,
					this.field
				);
				if (fieldData === null || typeof fieldData !== "object") {
					if (resolveContext.log)
						resolveContext.log(
							"Field '" +
								this.field +
								"' doesn't contain a valid alias configuration"
						);
					return callback();
				}
				/** @type {JsonPrimitive | undefined} */
				const data = Object.prototype.hasOwnProperty.call(
					fieldData,
					innerRequest
				)
					? /** @type {{[Key in string]: JsonPrimitive}} */ (fieldData)[
							innerRequest
					  ]
					: innerRequest.startsWith("./")
					? /** @type {{[Key in string]: JsonPrimitive}} */ (fieldData)[
							innerRequest.slice(2)
					  ]
					: undefined;
				if (data === innerRequest) return callback();
				if (data === undefined) return callback();
				if (data === false) {
					/** @type {ResolveRequest} */
					const ignoreObj = {
						path: false,
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
					if (typeof resolveContext.yield === "function") {
						resolveContext.yield(ignoreObj);
						return callback(null, null);
					}
					return callback(null, ignoreObj);
				}
				/** @type {ResolveRequest} */
				const obj = {
					path: /** @type {string} */ (request.descriptionFileRoot),
					context: request.context,
					descriptionFilePath: request.descriptionFilePath,
					descriptionFileRoot: request.descriptionFileRoot,
					descriptionFileData: request.descriptionFileData,
					relativePath: request.relativePath,
					ignoreSymlinks: request.ignoreSymlinks,
					fullySpecified: false,
					__innerRequest: request.__innerRequest,
					__innerRequest_request: request.__innerRequest_request,
					__innerRequest_relativePath: request.__innerRequest_relativePath,

					request: /** @type {string} */ (data),
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
					"aliased from description file " +
						request.descriptionFilePath +
						" with mapping '" +
						innerRequest +
						"' to '" +
						/** @type {string} */ (data) +
						"'",
					resolveContext,
					(err, result) => {
						if (err) return callback(err);

						// Don't allow other aliasing or raw request
						if (result === undefined) return callback(null, null);
						callback(null, result);
					}
				);
			});
	}
};
