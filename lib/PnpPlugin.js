"use strict";

const path = require("path");

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
				let request = requestContext.request;
				let issuer = requestContext.context.issuer;

				// When using require.context, issuer seems to be false (cf https://github.com/webpack/webpack-dev-server/blob/d0725c98fb752d8c0b1e8c9067e526e22b5f5134/client-src/default/index.js#L94)
				if (!issuer) issuer = `${requestContext.path}/`;

				// We only support issuer when they're absolute paths. I'm not sure the opposite can ever happen, but better check here.
				if (!path.isAbsolute(issuer))
					throw new Error(
						`Cannot successfully resolve this dependency - issuer not supported (${issuer})`
					);

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
