/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").FileSystem} FileSystem */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

/**
 * Per-filesystem inode cache. The cache lifetime is tied to the filesystem
 * object (same invariant as `_pathCacheByFs` in `Resolver.js`): when the
 * user swaps filesystems the entries become unreachable and get collected.
 * @type {WeakMap<FileSystem, Map<string, ResolveRequest>>}
 */
const _inodeCacheByFs = new WeakMap();

module.exports = class HardlinkPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 */
	constructor(source) {
		this.source = source;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const fs = resolver.fileSystem;
		let cache = _inodeCacheByFs.get(fs);
		if (cache === undefined) {
			cache = new Map();
			_inodeCacheByFs.set(fs, cache);
		}
		const inodeCache = cache;

		resolver
			.getHook(this.source)
			.tapAsync("HardlinkPlugin", (request, resolveContext, callback) => {
				const filePath = request.path;
				if (!filePath) return callback();

				fs.stat(filePath, (err, stat) => {
					if (err || !stat || !stat.isFile()) return callback();

					const { ino } = stat;
					if (ino === 0) return callback();

					const key = `${stat.dev}:${ino}`;
					const cached = inodeCache.get(key);

					if (cached !== undefined) {
						if (cached.path !== filePath) {
							if (resolveContext.log) {
								resolveContext.log(
									`deduplicated hardlink ${filePath} to ${cached.path}`,
								);
							}
							return callback(null, cached);
						}
					} else {
						inodeCache.set(key, { ...request });
					}
					callback();
				});
			});
	}
};
