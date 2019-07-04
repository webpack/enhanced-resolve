/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = class AliasPlugin {
	constructor(source, options, target) {
		this.source = source;
		this.options = Array.isArray(options) ? options : [options];
		this.target = target;
	}

	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("AliasPlugin", (request, resolveContext, callback) => {
				const innerRequest = request.request || request.path;
				if (!innerRequest) return callback();
				for (const item of this.options) {
					if (
						innerRequest === item.name ||
						(!item.onlyModule && innerRequest.startsWith(item.name + "/"))
					) {
						if (
							innerRequest !== item.alias &&
							!innerRequest.startsWith(item.alias + "/")
						) {
							const newRequestStr =
								item.alias + innerRequest.substr(item.name.length);
							const obj = {
								...request,
								request: newRequestStr
							};
							return resolver.doResolve(
								target,
								obj,
								"aliased with mapping '" +
									item.name +
									"': '" +
									item.alias +
									"' to '" +
									newRequestStr +
									"'",
								resolveContext,
								(err, result) => {
									if (err) return callback(err);

									// Don't allow other aliasing or raw request
									if (result === undefined) return callback(null, null);
									callback(null, result);
								}
							);
						}
					}
				}
				return callback();
			});
	}
};
