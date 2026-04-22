/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class FileExistsPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, target) {
		this.source = source;
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		const fs = resolver.fileSystem;
		resolver
			.getHook(this.source)
			.tapPromise("FileExistsPlugin", async (request, resolveContext) => {
				const file = request.path;
				if (!file) return;
				const stat = await new Promise((resolve) => {
					fs.stat(file, (err, stats) => {
						resolve(err || !stats ? null : stats);
					});
				});
				if (!stat) {
					if (resolveContext.missingDependencies) {
						resolveContext.missingDependencies.add(file);
					}
					if (resolveContext.log) resolveContext.log(`${file} doesn't exist`);
					return;
				}
				if (!stat.isFile()) {
					if (resolveContext.missingDependencies) {
						resolveContext.missingDependencies.add(file);
					}
					if (resolveContext.log) resolveContext.log(`${file} is not a file`);
					return;
				}
				if (resolveContext.fileDependencies) {
					resolveContext.fileDependencies.add(file);
				}
				return resolver.doResolve(
					target,
					request,
					`existing file: ${file}`,
					resolveContext,
				);
			});
	}
};
