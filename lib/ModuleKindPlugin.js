/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = class ModuleKindPlugin {
	constructor(source, target) {
		this.source = source;
		this.target = target;
	}

	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("ModuleKindPlugin", (request, resolveContext, callback) => {
				if (!request.module) return callback();
				resolver.doResolve(
					target,
					request,
					"resolve as module",
					resolveContext,
					(err, result) => {
						if (err) return callback(err);

						// Don't allow other alternatives
						if (result === undefined) return callback(null, null);
						callback(null, result);
					}
				);
			});
	}
};
