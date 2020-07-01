/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const path = require("path");
const forEachBail = require("./forEachBail");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

const slashCharCode = "/".charCodeAt(0);

class PathPlugin {
	/**
	 * @param {string | ResolveStepHook} source source hook
	 * @param {Set<string>} roots roots
	 * @param {string | ResolveStepHook} target target hook
	 */
	constructor(source, roots, target) {
		this.roots = Array.from(roots);
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
			.tapAsync("PathPlugin", (request, resolveContext, callback) => {
				if (
					request.relativePath &&
					request.relativePath.charCodeAt(0) !== slashCharCode
				)
					return callback();

				forEachBail(
					this.roots,
					(root, callback) => {
						const obj = { ...request };
						if (request.path) obj.path = path.join(root, request.path);
						obj.relativePath = path.join(
							root,
							/** @type {string} */ (request.relativePath)
						);
						resolver.doResolve(
							target,
							obj,
							`using path plugin: ${root}`,
							resolveContext,
							callback
						);
					},
					(err, result) => callback(err, result || null)
				);
			});
	}
}

module.exports = PathPlugin;
