/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { PathType, getType } = require("./util/path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {string | Array<string> | false} Alias */
/** @typedef {{alias: Alias, name: string, onlyModule?: boolean, nameWithSlash?: string, absolutePath?: string}} AliasOption */

module.exports = class AliasPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {AliasOption | Array<AliasOption>} options options
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, options, target) {
		this.source = source;
		this.options = Array.isArray(options) ? options : [options];
		for (const item of this.options) {
			item.nameWithSlash = item.name + "/";
		}
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);

		/**
		 * @param {string} maybeAbsolutePath path
		 * @returns {null|string} absolute path with slash ending
		 */
		const getAbsolutePathWithSlashEnding = maybeAbsolutePath => {
			const type = getType(maybeAbsolutePath);
			if (type === PathType.AbsolutePosix || type === PathType.AbsoluteWin) {
				return resolver.join(maybeAbsolutePath, "_").slice(0, -1);
			}
			return null;
		};

		/**
		 * @param {string} path path
		 * @param {AliasOption} item item
		 * @returns {boolean} true, if path is sub path
		 */
		const isSubPath = (path, item) => {
			if (item.absolutePath === undefined) {
				item.absolutePath = getAbsolutePathWithSlashEnding(item.name);
			}

			if (!item.absolutePath) return false;
			return path.startsWith(item.absolutePath);
		};

		resolver
			.getHook(this.source)
			.tapAsync("AliasPlugin", (request, resolveContext, callback) => {
				const innerRequest = request.request || request.path;
				if (!innerRequest) return callback();
				let i = 0;

				let resolveCallback;

				while (i < this.options.length) {
					const item = this.options[i];
					i++;
					if (
						innerRequest === item.name ||
						(!item.onlyModule &&
							(request.request
								? innerRequest.startsWith(item.nameWithSlash)
								: isSubPath(innerRequest, item)))
					) {
						/** @type {string} */
						const remainingRequest =
							innerRequest === item.name
								? undefined
								: innerRequest.slice(item.name.length);
						/**
						 * @param {Alias} alias alias
						 * @param {(err?: null|Error, result?: null|ResolveRequest) => void} callback callback
						 * @returns {void}
						 */
						if (Array.isArray(item.alias)) {
						  for (const alias of item.alias) {
						    // TODO: maybe shouldBail should be set to true for the last object?
								const done = processAlias(
									alias,
									request,
									callback,
									innerRequest,
									remainingRequest,
									resolver,
									target,
									item,
									resolveContext,
									resolveCallback,
									false
								);
								if (done) {
									return;
								}
							}
						} else {
							const done = processAlias(
								item.alias,
								request,
								callback,
								innerRequest,
								remainingRequest,
								resolver,
								target,
								item,
								resolveContext,
								resolveCallback
							);
							if (done) {
								return;
							}
						}
					}
				}
				// No match
				callback();
			});
	}
};

function processAlias(
	alias,
	request,
	callback,
	innerRequest,
	remainingRequest,
	resolver,
	target,
	item,
	resolveContext,
	resolveCallback,
	shouldBail = true
) {
	if (alias === false) {
		/** @type {ResolveRequest} */
		const ignoreObj = {
			...request,
			path: false
		};
		if (typeof resolveContext.yield === "function") {
			resolveContext.yield(ignoreObj);
			callback(null, null);
			return true;
		}
		callback(null, ignoreObj);
		return true;
	}
	if (innerRequest !== alias && !innerRequest.startsWith(alias + "/")) {
		const newRequestStr = remainingRequest ? alias + remainingRequest : alias;
		/** @type {ResolveRequest} */
		const obj = {
			...request,
			request: newRequestStr,
			fullySpecified: false
		};
		let done = false;
		if (!resolveCallback) {
			resolveCallback = (err, result) => {
				if (err || result) {
					done = true;
					if (err) return callback(err);
					return callback(null, result);
				}
				// TODO: support also logic when this callback is called async
				if (shouldBail) {
					return callback(null, null);
				}
			};
		}
		resolver.doResolve(
			target,
			obj,
			"aliased with mapping '" +
				item.name +
				"': '" +
				alias +
				"' to '" +
				newRequestStr +
				"'",
			resolveContext,
			resolveCallback
		);
		// the resolveCallback will take care of calling the callback
		return shouldBail || done;
	}
}
