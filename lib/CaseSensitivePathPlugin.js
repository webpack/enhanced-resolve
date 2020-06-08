/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class CaseSensitivePathPlugin {
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
			.tapAsync(
				"CaseSensitivePathPlugin",
				(request, resolveContext, callback) => {
					const file = request.path;
					if (!file) return callback();
					fs.realpath(file, (err, realPath) => {
						if (file !== realPath) {
							return callback();
						}
						resolver.doResolve(
							target,
							request,
							"true case file: " + file,
							resolveContext,
							callback
						);
					});
				}
			);
	}
};
