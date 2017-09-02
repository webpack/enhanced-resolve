"use strict";
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const createInnerCallback = require("./createInnerCallback");
const forEachBail = require("./forEachBail");
const getPaths = require("./getPaths");
const assign = require("object-assign");

class ModulesInHierachicDirectoriesPlugin {
	constructor(source, directories, target) {
		this.source = source;
		this.directories = [].concat(directories);
		this.target = target;
	}
	apply(resolver) {
		const directories = this.directories;
		const target = this.target;
		resolver.plugin(this.source, function(request, callback) {
			const fs = this.fileSystem;
			const topLevelCallback = callback;
			const addrs = getPaths(request.path).paths.map((p) => {
				return directories.map((d) => this.join(p, d), this);
			}, this).reduce((array, p) => {
				array.push.apply(array, p);
				return array;
			}, []);
			forEachBail(addrs, (addr, callback) => {
				fs.stat(addr, (err, stat) => {
					if(!err && stat && stat.isDirectory()) {
						const obj = assign({}, request, {
							path: addr,
							request: "./" + request.request
						});
						const message = "looking for modules in " + addr;
						return resolver.doResolve(target, obj, message, createInnerCallback(callback, topLevelCallback));
					}
					if(topLevelCallback.log) topLevelCallback.log(addr + " doesn't exist or is not a directory");
					if(topLevelCallback.missing) topLevelCallback.missing.push(addr);
					return callback();
				});
			}, callback);
		});
	}
}
module.exports = ModulesInHierachicDirectoriesPlugin;
