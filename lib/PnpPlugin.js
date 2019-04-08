"use strict";

module.exports = class PnpPlugin {
	constructor(source, pnpApi, target) {
		this.source = source;
		this.pnpApi = pnpApi;
		this.target = target;
	}

	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("PnpPlugin", (requestContext, resolveContext, callback) => {
				const request = requestContext.request;

				// The trailing slash indicates to PnP that this value is a folder rather than a file
				const issuer = `${requestContext.path}/`;

				let resolution;
				try {
					resolution = this.pnpApi.resolveToUnqualified(request, issuer, {
						considerBuiltins: false
					});
				} catch (error) {
					return callback(error);
				}

				resolver.doResolve(
					target,
					Object.assign({}, requestContext, {
						request: resolution
					}),
					null,
					resolveContext,
					callback
				);
			});
	}
};
