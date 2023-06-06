/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Burhanuddin Udaipurwala @burhanuday
*/

"use strict";

const path = require("path");
const DescriptionFileUtils = require("./DescriptionFileUtils");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").JsonObject} JsonObject */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

const alreadyTriedStyleField = Symbol("alreadyTriedStyleField");

module.exports = class StyleFieldPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string} name fieldName
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, name, target) {
		this.source = source;
		this.name = name;
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
			.tapAsync("StyleFieldPlugin", (request, resolveContext, callback) => {
				// if request.context.issuer is not a css file, don't resolve to style field
				const isIssuerAStyleFile =
					request.context &&
					// @ts-ignore
					request.context.issuer &&
					// @ts-ignore
					request.context.issuer.endsWith(".css");
				if (
					!isIssuerAStyleFile ||
					request.path !== request.descriptionFileRoot ||
					/** @type {ResolveRequest & { [alreadyTriedStyleField]?: string }} */
					(request)[alreadyTriedStyleField] === request.descriptionFilePath ||
					!request.descriptionFilePath
				)
					return callback();
				const filename = path.basename(request.descriptionFilePath);
				let stylePath =
					/** @type {string|null|undefined} */
					(
						DescriptionFileUtils.getField(
							/** @type {JsonObject} */ (request.descriptionFileData),
							this.name
						)
					);

				if (
					!stylePath ||
					typeof stylePath !== "string" ||
					stylePath === "." ||
					stylePath === "./"
				) {
					return callback();
				}
				if (
					// this.options.forceRelative
					true &&
					!/^\.\.?\//.test(stylePath)
				)
					stylePath = "./" + stylePath;
				/** @type {ResolveRequest & { [alreadyTriedStyleField]?: string }} */
				const obj = {
					...request,
					request: stylePath,
					module: false,
					directory: stylePath.endsWith("/"),
					[alreadyTriedStyleField]: request.descriptionFilePath
				};
				return resolver.doResolve(
					target,
					obj,
					"use " + stylePath + " from " + this.name + " in " + filename,
					resolveContext,
					callback
				);
			});
	}
};
