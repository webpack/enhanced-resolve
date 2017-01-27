"use strict"
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const assign = require("object-assign");

class ResultPlugin {
	constructor(source) {
		this.source = source;
	}

	apply(resolver) {
		const target = this.target;
		resolver.plugin(this.source, (request, callback) => {
			const obj = assign({}, request);
			resolver.applyPluginsAsyncSeries1("result", obj, err => {
				if(err) callback(err);
				callback(null, obj);
			});
		});
	};
}
module.exports = ResultPlugin;
