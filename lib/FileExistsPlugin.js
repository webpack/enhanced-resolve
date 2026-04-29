/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

// On case-insensitive filesystems (macOS APFS, Windows NTFS by default)
// `fs.stat` succeeds for any case-variant of the on-disk filename, so
// the wrong-cased path would propagate into `fileDependencies` and the
// resolved result. Watchpack's `collectTimeInfoEntries` keys time info
// by the on-disk casing, so consumers querying with the requested casing
// miss the entry and Fast Refresh stops after the first edit
// (watchpack#228). Only platforms whose default filesystem is
// case-insensitive need the readdir-based normalization; on Linux's
// case-sensitive defaults `stat` already implies the basename matches
// the on-disk casing, so we skip the round-trip entirely.
const NORMALIZE_CASE =
	process.platform === "darwin" || process.platform === "win32";

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
					if (!NORMALIZE_CASE) {
						if (resolveContext.fileDependencies) {
							resolveContext.fileDependencies.add(file);
						}
						return resolver.doResolve(
							target,
							request,
							`existing file: ${file}`,
							resolveContext,
							callback,
						);
					}
					// Case-insensitive filesystem: rewrite the basename to the
					// actual on-disk casing via the parent directory listing,
					// which `CachedInputFileSystem` caches per-directory.
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
