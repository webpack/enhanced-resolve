/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var createLoggingCallback = require("./createLoggingCallback");

function ModuleTemplatesPlugin(moduleType, templates, targetModuleType) {
	this.moduleType = moduleType;
	this.targetModuleType = targetModuleType;
	this.templates = templates;
}
module.exports = ModuleTemplatesPlugin;

ModuleTemplatesPlugin.prototype.apply = function(resolver) {
	var templates = this.templates;
	var targetModuleType = this.targetModuleType;
	resolver.plugin("module-" + this.moduleType, function(request, callback) {
		var fs = this.fileSystem;
		var log = callback.log;
		var i = request.request.indexOf("/"),
			j = request.request.indexOf("\\");
		var p = i < 0 ? j : j < 0 ? i : i < j ? i : j;
		var moduleName, remainingRequest;
		if(p < 0) {
			moduleName = request.request;
			remainingRequest = "";
		} else {
			moduleName = request.request.substr(0, p);
			remainingRequest = request.request.substr(p);
		}
		this.forEachBail(templates, function(template, callback) {
			var moduleFinalName = template.replace(/\*/g, moduleName);
			this.applyPluginsParallelBailResult("module-" + targetModuleType, {
				path: request.path,
				request: moduleFinalName + remainingRequest,
				query: request.query,
				directory: request.directory
			}, createLoggingCallback(function(err, result) {
				if(err) return callback(err);
				if(!result) return callback();
				return callback(null, result);
			}, log, "module variation " + moduleFinalName));
		}.bind(this), callback);
	});
};
