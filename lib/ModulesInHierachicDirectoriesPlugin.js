/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const forEachBail = require("./forEachBail");
const getPaths = require("./getPaths");

module.exports = class ModulesInHierachicDirectoriesPlugin {
	constructor(source, directories, jail, target) {
		this.source = source;
		this.directories = [].concat(directories);
		this.target = target;
		this.jail = jail ;
	}

	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync(
				"ModulesInHierachicDirectoriesPlugin",
				(request, resolveContext, callback) => {
					const fs = resolver.fileSystem;
					// console.log("ModulesInHierachicDirectoriesPlugin", getPaths(request.path));
					const addrs = getPaths(request.path, this.jail)
						.paths.map(p => {
							// console.log(this.directories);
							console.log(this.directories.map(d => resolver.join(p, d)));
							return this.directories.map(d => resolver.join(p, d));
						})
						.reduce((array, p) => {
							array.push.apply(array, p);
							return array;
						}, []);
					console.log("*************");
					// throw Error("--");
					forEachBail(
						addrs,
						(addr, callback) => {
							fs.stat(addr, (err, stat) => {
								if (!err && stat && stat.isDirectory()) {
									const obj = Object.assign({}, request, {
										path: addr,
										request: "./" + request.request
									});
									const message = "looking for modules in " + addr;
									return resolver.doResolve(
										target,
										obj,
										message,
										resolveContext,
										callback
									);
								}
								if (resolveContext.log)
									resolveContext.log(
										addr + " doesn't exist or is not a directory"
									);
								if (resolveContext.missing) resolveContext.missing.add(addr);
								return callback();
							});
						},
						callback
					);
				}
			);
	}
};
