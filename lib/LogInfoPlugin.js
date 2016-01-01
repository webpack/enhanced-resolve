/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var assign = require("object-assign");

function LogInfoPlugin(source) {
	this.source = source;
}
module.exports = LogInfoPlugin;

LogInfoPlugin.prototype.apply = function(resolver) {
	var target = this.target;
	resolver.plugin(this.source, function(request, callback) {
		if(!callback.log) return callback();
		var log = callback.log;
		if(request.path) log("Resolving in directory: " + request.path);
		if(request.request) log("Resolving request: " + request.request);
		if(request.module) log("Request is an module request.");
		if(request.directory) log("Request is a directory request.");
		if(request.query) log("Resolving request query: " + request.query);
		if(request.relativePath) log("Relative path from description file is: " + request.relativePath);
		callback();
	});
};
