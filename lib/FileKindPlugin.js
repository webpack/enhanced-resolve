/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class FileKindPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, target) {
		this.source = source;
		this.target = target;
	}

	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("FileKindPlugin", (request, resolveContext, callback) => {
				if (request.directory) return callback();
				resolver.doResolve(target, request, null, resolveContext, callback);
			});
	}
};
