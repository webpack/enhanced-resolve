/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { getPathsCached } = require("./getPaths");
const { PathType, getType } = require("./util/path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class SymlinkPlugin {
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
			.tapPromise("SymlinkPlugin", async (request, resolveContext) => {
				if (request.ignoreSymlinks) return;
				const pathsResult = getPathsCached(
					fs,
					/** @type {string} */ (request.path),
				);
				const { paths, segments } = pathsResult;
				// `pathsResult.segments` is shared across callers via the cache.
				// The only place we need to mutate is `pathSegments[idx] = result`
				// when `fs.readlink` succeeds — which is rare (the vast majority
				// of paths contain no symlinks, e.g. every resolve on
				// `cache-predicate`'s no-symlink fixture). Defer the copy until
				// we actually see a symlink so the common no-symlink path stays
				// allocation-free.
				/** @type {string[] | null} */
				let pathSegments = null;

				let absoluteIdx = -1;
				for (let idx = 0; idx < paths.length; idx++) {
					const path = paths[idx];
					if (resolveContext.fileDependencies) {
						resolveContext.fileDependencies.add(path);
					}
					const readlinkResult = await new Promise((resolve) => {
						fs.readlink(path, (err, result) => {
							resolve(err || !result ? null : result);
						});
					});
					if (readlinkResult) {
						// First symlink seen — take our own copy now, so
						// the cached `segments` array stays pristine for
						// sibling resolves.
						if (pathSegments === null) {
							pathSegments = [...segments];
						}
						pathSegments[idx] = /** @type {string} */ (readlinkResult);
						// Shortcut when absolute symlink found
						const resultType = getType(readlinkResult.toString());
						if (
							resultType === PathType.AbsoluteWin ||
							resultType === PathType.AbsolutePosix
						) {
							absoluteIdx = idx;
							break;
						}
					}
				}

				if (pathSegments === null) return;
				// `pathSegments !== null` implies we took a copy already, so
				// `slice` to trim is fine and spreading to "unshare" is no
				// longer necessary.
				const resultSegments =
					absoluteIdx >= 0
						? pathSegments.slice(0, absoluteIdx + 1)
						: pathSegments;
				const result = resultSegments.reduceRight((a, b) =>
					resolver.join(a, b),
				);
				/** @type {ResolveRequest} */
				const obj = {
					...request,
					path: result,
				};
				return resolver.doResolve(
					target,
					obj,
					`resolved symlink to ${result}`,
					resolveContext,
				);
			});
	}
};
