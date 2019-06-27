/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
"use strict";

function startsWith(string, searchString) {
	const stringLength = string.length;
	const searchLength = searchString.length;

	// early out if the search length is greater than the search string
	if (searchLength > stringLength) {
		return false;
	}
	let index = -1;
	while (++index < searchLength) {
		if (string.charCodeAt(index) !== searchString.charCodeAt(index)) {
			return false;
		}
	}
	return true;
}

function normalizeOptions(alias) {
	if (Array.isArray(alias)) return alias;

	return Object.keys(alias).reduce((options, key) => {
		let onlyModule = false;
		let obj = alias[key];
		if (/\$$/.test(key)) {
			onlyModule = true;
			key = key.substr(0, key.length - 1);
		}
		const base = { name: key, onlyModule: onlyModule };

		let fragments;
		if (typeof obj === "string") {
			fragments = [{ alias: obj }];
		} else if (Array.isArray(obj)) {
			fragments = obj.reduce(
				(fragments, aliasString) =>
					fragments.concat(
						Object.assign({}, base, {
							alias: aliasString
						})
					),
				[]
			);
		} else {
			fragments = [obj];
		}
		return options.concat(
			fragments.map(fragment => Object.assign({}, base, fragment))
		);
	}, []);
}

class AliasPlugin {
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

				optionsRecur(this.options);

				function optionsRecur(options) {
					const [item, ...restOptions] = options;
					// Any of options were not matched
					if (!item) return callback();

					const isEligibleRequest =
						innerRequest === item.name ||
						(!item.onlyModule && startsWith(innerRequest, item.name + "/"));

					if (!isEligibleRequest) return optionsRecur(restOptions);

					const needsAliasing =
						innerRequest !== item.alias &&
						!startsWith(innerRequest, item.alias + "/");

					if (!needsAliasing) return optionsRecur(restOptions);

					const newRequestStr =
						item.alias + innerRequest.substr(item.name.length);
					const obj = Object.assign({}, request, { request: newRequestStr });
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

							// Try next alias
							if (result === undefined) return optionsRecur(restOptions);

							// Found one!
							callback(null, result);
						}
					);
				}
			});
	}
}

module.exports = AliasPlugin;
module.exports.normalizeOptions = normalizeOptions;
