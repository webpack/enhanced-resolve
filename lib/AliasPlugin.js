/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const fs = require("fs");
const path = require("path");

function startsWith(string, searchString) {
	const stringLength = string.length;
	const searchLength = searchString.length;

	// early out if the search length is greater than the search string
	if(searchLength > stringLength) {
		return false;
	}
	let index = -1;
	while(++index < searchLength) {
		if(string.charCodeAt(index) !== searchString.charCodeAt(index)) {
			return false;
		}
	}
	return true;
}

module.exports = class AliasPlugin {
	constructor(source, options, target) {
		this.source = source;
		this.options = Array.isArray(options) ? options : [options];
		this.target = target;
	}

	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver.getHook(this.source).tapAsync("AliasPlugin", (request, resolveContext, callback) => {
			const innerRequest = request.request;
			if(!innerRequest) return callback();
			for(const item of this.options) {
				if(innerRequest === item.name || (!item.onlyModule && startsWith(innerRequest, item.name + "/"))) {
					if(Array.isArray(item.alias)) {
						for(let i = 0, length = item.alias.length; i < length; i++) {
							let nItem = Object.assign({}, item);
							nItem.alias = item.alias[i]; // alias is the folder

							if(innerRequest !== nItem.alias && !startsWith(innerRequest, nItem.alias + "/")) {
								const newRequestStr = nItem.alias + innerRequest.substr(nItem.name.length);
								const obj = Object.assign({}, request, {
									request: newRequestStr
								});

								var files = fs.readdirSync(nItem.alias, {
									encoding: "utf-8"
								});

								let filePathFound = null;
								const matchingFileFound = files.find((fn, idx, obj) => {
									let ext = path.extname(fn);
									let f = newRequestStr + ext;
									let exists = fs.existsSync(f);

									if(exists) {
										filePathFound = f;
									}
									return exists;
								});

								if(matchingFileFound) {
									return resolver.doResolve(target, obj, "aliased with mapping '" + nItem.name + "': '" + nItem.alias + "' to '" + filePathFound + "'", resolveContext, (err, result) => {
										if(err) return callback(err);

										// Don't allow other aliasing or raw request
										if(result === undefined) return callback(null, null);
										callback(null, result);
									});
								}
							}
						}
					} else {
						if(innerRequest !== item.alias && !startsWith(innerRequest, item.alias + "/")) {
							const newRequestStr = item.alias + innerRequest.substr(item.name.length);
							const obj = Object.assign({}, request, {
								request: newRequestStr
							});
							return resolver.doResolve(target, obj, "aliased with mapping '" + item.name + "': '" + item.alias + "' to '" + newRequestStr + "'", resolveContext, (err, result) => {
								if(err) return callback(err);

								// Don't allow other aliasing or raw request
								if(result === undefined) return callback(null, null);
								callback(null, result);
							});
						}
					}
				}
			}
			return callback();
		});
	}
};
