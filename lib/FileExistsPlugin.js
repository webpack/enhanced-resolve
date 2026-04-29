/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");

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
			.tapAsync("FileExistsPlugin", (request, resolveContext, callback) => {
				const file = request.path;
				if (!file) return callback();
				fs.stat(file, (err, stat) => {
					if (err || !stat) {
						if (resolveContext.missingDependencies) {
							resolveContext.missingDependencies.add(file);
						}
						if (resolveContext.log) resolveContext.log(`${file} doesn't exist`);
						return callback();
					}
					if (!stat.isFile()) {
						if (resolveContext.missingDependencies) {
							resolveContext.missingDependencies.add(file);
						}
						if (resolveContext.log) resolveContext.log(`${file} is not a file`);
						return callback();
					}
					// On case-insensitive filesystems (e.g. macOS APFS, NTFS),
					// fs.stat succeeds for any case-variant of the on-disk
					// filename. Without normalization, the wrong-cased path
					// flows into resolveContext.fileDependencies and the
					// resolved result, which breaks downstream watchers
					// (watchpack#228): the watcher records the on-disk casing
					// while consumers query with the requested casing, causing
					// time-info lookups to miss and Fast Refresh to stop after
					// the first edit. Normalize the basename to the actual
					// on-disk casing by consulting the parent directory listing.
					const dir = path.dirname(file);
					const basename = path.basename(file);
					fs.readdir(dir, (readdirErr, entries) => {
						let resolvedFile = file;
						let resolvedRequest = request;
						if (!readdirErr && entries) {
							let exact = false;
							/** @type {string | null} */
							let actual = null;
							for (const entry of entries) {
								const name =
									typeof entry === "string"
										? entry
										: /** @type {{ name: string }} */ (entry).name;
								if (name === basename) {
									exact = true;
									break;
								}
								if (
									actual === null &&
									name.toLowerCase() === basename.toLowerCase()
								) {
									actual = name;
								}
							}
							if (!exact && actual !== null) {
								resolvedFile = path.join(dir, actual);
								resolvedRequest = {
									...request,
									path: resolvedFile,
								};
							}
						}
						if (resolveContext.fileDependencies) {
							resolveContext.fileDependencies.add(resolvedFile);
						}
						resolver.doResolve(
							target,
							resolvedRequest,
							`existing file: ${resolvedFile}`,
							resolveContext,
							callback,
						);
					});
				});
			});
	}
};
