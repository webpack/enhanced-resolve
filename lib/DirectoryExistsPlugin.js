/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class DirectoryExistsPlugin {
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
			.tapPromise("DirectoryExistsPlugin", async (request, resolveContext) => {
				const directory = request.path;
				if (!directory) return;
				const stat = await new Promise((resolve) => {
					fs.stat(directory, (err, stats) => {
						resolve(err || !stats ? null : stats);
					});
				});
				if (!stat) {
					if (resolveContext.missingDependencies) {
						resolveContext.missingDependencies.add(directory);
					}
					if (resolveContext.log) {
						resolveContext.log(`${directory} doesn't exist`);
					}
					return;
				}
				if (!stat.isDirectory()) {
					if (resolveContext.missingDependencies) {
						resolveContext.missingDependencies.add(directory);
					}
					if (resolveContext.log) {
						resolveContext.log(`${directory} is not a directory`);
					}
					return;
				}
				if (resolveContext.fileDependencies) {
					resolveContext.fileDependencies.add(directory);
				}
				return resolver.doResolve(
					target,
					request,
					`existing directory ${directory}`,
					resolveContext,
				);
			});
	}
};
