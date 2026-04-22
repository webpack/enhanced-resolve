/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const forEachBailPromise = require("./forEachBailPromise");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

class RootsPlugin {
	/**
	 * @param {string | ResolveStepHook} source source hook
	 * @param {Set<string>} roots roots
	 * @param {string | ResolveStepHook} target target hook
	 */
	constructor(source, roots, target) {
		this.roots = [...roots];
		this.source = source;
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
			.tapPromise("RootsPlugin", async (request, resolveContext) => {
				const req = request.request;
				if (!req) return;
				if (!req.startsWith("/")) return;

				return forEachBailPromise(this.roots, (root) => {
					const path = resolver.join(root, req.slice(1));
					/** @type {ResolveRequest} */
					const obj = {
						...request,
						path,
						relativePath: request.relativePath && path,
					};
					return resolver.doResolve(
						target,
						obj,
						`root path ${root}`,
						resolveContext,
					);
				});
			});
	}
}

module.exports = RootsPlugin;
