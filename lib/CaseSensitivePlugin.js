/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

// Rewrites the basename of a candidate file path to its actual on-disk
// casing before existence checks run.
//
// On case-insensitive filesystems (macOS APFS, Windows NTFS by default)
// `fs.stat` succeeds for any case-variant of the on-disk filename, so a
// wrong-cased import (e.g. `./B` against an actual `b.tsx`) would
// otherwise be reported through `FileExistsPlugin` with the wrong
// casing — leaking that casing into `resolveContext.fileDependencies`
// and the resolved result. Watchpack's directory watcher records the
// on-disk casing while consumers query with the requested casing, so
// time-info lookups miss and Fast Refresh stops after the first edit
// (watchpack#228).
//
// `ResolverFactory` registers this plugin before `FileExistsPlugin` and
// only on platforms whose default filesystem is case-insensitive, so
// case-sensitive filesystems pay no readdir overhead. The readdir is
// cached per-directory by `CachedInputFileSystem`, so sibling
// extension probes in the same directory share the cost.
module.exports = class CaseSensitivePlugin {
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
			.tapAsync("CaseSensitivePlugin", (request, resolveContext, callback) => {
				const file = request.path;
				if (!file) return callback();
				const dir = path.dirname(file);
				const basename = path.basename(file);
				fs.readdir(dir, (err, entries) => {
					// On readdir failure (parent missing, permission denied),
					// fall through and let downstream existence checks decide.
					if (err || !entries) return callback();
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
					if (exact || actual === null) return callback();
					const normalizedFile = path.join(dir, actual);
					/** @type {ResolveRequest} */
					const normalizedRequest = {
						...request,
						path: normalizedFile,
					};
					resolver.doResolve(
						target,
						normalizedRequest,
						`normalized casing to on-disk: ${normalizedFile}`,
						resolveContext,
						callback,
					);
				});
			});
	}
};
