/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const forEachBail = require("./forEachBail");
const getPaths = require("./getPaths");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./Resolver").ResolveContext} ResolveContext */
/** @typedef {(err?: null | Error, result?: null | ResolveRequest) => void} InnerCallback */
/**
 * @param {Resolver} resolver resolver
 * @param {string[]} directories directories
 * @param {ResolveStepHook} target target
 * @param {ResolveRequest} request request
 * @param {ResolveContext} resolveContext resolve context
 * @param {InnerCallback} callback callback
 * @returns {void}
 */
function modulesResolveHandler(
	resolver,
	directories,
	target,
	request,
	resolveContext,
	callback,
) {
	const fs = resolver.fileSystem;
	// Build the candidate address list as a single pass of nested loops
	// instead of `.map(dir => directories.map(…))` + `.reduce(spread)`. The
	// old shape allocated `paths.length` intermediate sub-arrays plus a
	// reduce accumulator closure; the flat form allocates exactly one
	// array and pushes directly — identical result, meaningfully less
	// garbage per resolve under ModulesInHierarchicalDirectoriesPlugin.
	const { paths } = getPaths(/** @type {string} */ (request.path));
	const addrs = [];
	for (let i = 0; i < paths.length; i++) {
		const ancestor = paths[i];
		for (let j = 0; j < directories.length; j++) {
			addrs.push(resolver.join(ancestor, directories[j]));
		}
	}
	forEachBail(
		addrs,
		/**
		 * @param {string} addr addr
		 * @param {(err?: null | Error, result?: null | ResolveRequest) => void} callback callback
		 * @returns {void}
		 */
		(addr, callback) => {
			fs.stat(addr, (err, stat) => {
				if (!err && stat && stat.isDirectory()) {
					/** @type {ResolveRequest} */
					const obj = {
						...request,
						path: addr,
						request: `./${request.request}`,
						module: false,
					};
					const message = `looking for modules in ${addr}`;
					return resolver.doResolve(
						target,
						obj,
						message,
						resolveContext,
						callback,
					);
				}
				if (resolveContext.log) {
					resolveContext.log(`${addr} doesn't exist or is not a directory`);
				}
				if (resolveContext.missingDependencies) {
					resolveContext.missingDependencies.add(addr);
				}
				return callback();
			});
		},
		callback,
	);
}

module.exports = {
	modulesResolveHandler,
};
