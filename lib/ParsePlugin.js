/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const cloneRequest = require("./cloneRequest");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class ParsePlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {Partial<ResolveRequest>} requestOptions request options
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, requestOptions, target) {
		this.source = source;
		this.requestOptions = requestOptions;
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
				// Build the new request as a structural clone of `request`, then apply
				// `parsed` and `requestOptions` via direct field assignments. This keeps
				// the hidden class of `obj` stable across calls.
				const obj = cloneRequest(request);
				obj.request = parsed.request;
				obj.query = parsed.query;
				obj.fragment = parsed.fragment;
				obj.module = parsed.module;
				obj.directory = parsed.directory;
				obj.file = parsed.file;
				obj.internal = parsed.internal;
				const { requestOptions } = this;
				if (requestOptions) {
					for (const key in requestOptions) {
						/** @type {Record<string, unknown>} */ (obj)[key] =
							/** @type {Record<string, unknown>} */ (requestOptions)[key];
					}
				}
				if (request.query && !parsed.query) {
					obj.query = request.query;
				}
				if (request.fragment && !parsed.fragment) {
					obj.fragment = request.fragment;
				}
				if (resolveContext.log) {
					if (parsed.module) resolveContext.log("Parsed request is a module");
					if (parsed.directory) {
						resolveContext.log("Parsed request is a directory");
					}
				}
				// There is an edge-case where a request with # can be a path or a fragment -> try both
				if (obj.request && !obj.query && obj.fragment) {
					const directory = obj.fragment.endsWith("/");
					const alternative = cloneRequest(obj);
					alternative.directory = directory;
					alternative.request =
						obj.request +
						(obj.directory ? "/" : "") +
						(directory ? obj.fragment.slice(0, -1) : obj.fragment);
					alternative.fragment = "";
					resolver.doResolve(
						target,
						alternative,
						null,
						resolveContext,
						(err, result) => {
							if (err) return callback(err);
							if (result) return callback(null, result);
							resolver.doResolve(target, obj, null, resolveContext, callback);
						},
					);
					return;
				}
				resolver.doResolve(target, obj, null, resolveContext, callback);
			});
	}
};
