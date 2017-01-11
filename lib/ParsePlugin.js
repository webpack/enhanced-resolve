/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var querystring = require('querystring');
var assign = require("object-assign");

function ParsePlugin(source, target) {
	this.source = source;
	this.target = target;
}
module.exports = ParsePlugin;

ParsePlugin.prototype.apply = function(resolver) {
	var target = this.target;
	resolver.plugin(this.source, function(request, callback) {
		var parsed = resolver.parse(request.request);
		var obj = assign({}, request, parsed);
		if(request.query || parsed.query) {
			obj.query = stringifyQuery(assign(parseQueryStr(parsed.query), parseQueryStr(request.query)));
		}
		if(parsed && callback.log) {
			if(parsed.module)
				callback.log("Parsed request is a module");
			if(parsed.directory)
				callback.log("Parsed request is a directory");
		}
		resolver.doResolve(target, obj, null, callback);
	});

	function parseQueryStr(query) {
		if(query && query.length && query[0] === "?") {
			query = query.slice(1);
		}
		return querystring.parse(query);
	}

	function stringifyQuery(obj) {
		var tokens = [];
		for(var key in obj) {
			tokens.push(key + (obj[key] ? "=" + obj[key] : ""));
		}
		return "?" + tokens.join("&");
	}
};
