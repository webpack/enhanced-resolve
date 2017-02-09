"use strict";
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const assign = require("object-assign");
const createInnerCallback = require("./createInnerCallback");

class ModuleKindPlugin {
	constructor(source, target) {
		this.source = source;
		this.target = target;
	}
	apply(resolver) {
		const target = this.target;
		resolver.plugin(this.source, (request, callback) => {
			if(!request.module) return callback();
			const obj = assign({}, request);
			delete obj.module;
			resolver.doResolve(target, obj, "resolve as module", createInnerCallback((err, result) => {
				if(arguments.length > 0) return callback(err, result);

				// Don't allow other alternatives
				callback(null, null);
			}, callback));
		});
	}
}
module.exports = ModuleKindPlugin;
