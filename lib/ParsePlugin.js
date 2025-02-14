/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class ParsePlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {boolean | undefined} fullySpecified override value for request.fullySpecified
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, fullySpecified, target) {
		this.source = source;
		this.fullySpecified = fullySpecified;
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
			.tapAsync("ParsePlugin", (request, resolveContext, callback) => {
				const parsed = resolver.parse(/** @type {string} */ (request.request));
				// Using an object literal here with properties in a predictable order, in testing
				// improves performance of this function by 90%.
				// Note that this means that custom properties must be part of `request.context`.
				/** @type {ResolveRequest} */
				const obj = {
					path: request.path,
					context: request.context,
					descriptionFilePath: request.descriptionFilePath,
					descriptionFileRoot: request.descriptionFileRoot,
					descriptionFileData: request.descriptionFileData,
					relativePath: request.relativePath,
					ignoreSymlinks: request.ignoreSymlinks,
					fullySpecified: this.fullySpecified,
					__innerRequest: request.__innerRequest,
					__innerRequest_request: request.__innerRequest_request,
					__innerRequest_relativePath: request.__innerRequest_relativePath,

					request: parsed.request,
					// If parsed.query and request.query are both falsy, prefer parsed.query
					query: parsed.query || request.query || parsed.query,
					// If parsed.fragment and request.fragment are both falsy, prefer parsed.fragment
					fragment: parsed.fragment || request.fragment || parsed.fragment,
					module: parsed.module,
					directory: parsed.directory,
					file: parsed.file,
					internal: parsed.internal
				};

				if (parsed && resolveContext.log) {
					if (parsed.module) resolveContext.log("Parsed request is a module");
					if (parsed.directory)
						resolveContext.log("Parsed request is a directory");
				}
				// There is an edge-case where a request with # can be a path or a fragment -> try both
				if (obj.request && !obj.query && obj.fragment) {
					const directory = obj.fragment.endsWith("/");
					/** @type {ResolveRequest} */
					const alternative = {
						...obj,
						directory,
						request:
							obj.request +
							(obj.directory ? "/" : "") +
							(directory ? obj.fragment.slice(0, -1) : obj.fragment),
						fragment: ""
					};
					resolver.doResolve(
						target,
						alternative,
						null,
						resolveContext,
						(err, result) => {
							if (err) return callback(err);
							if (result) return callback(null, result);
							resolver.doResolve(target, obj, null, resolveContext, callback);
						}
					);
					return;
				}
				resolver.doResolve(target, obj, null, resolveContext, callback);
			});
	}
};
