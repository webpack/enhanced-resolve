/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ModuleAsDirectoryPlugin(moduleType, templates) {
	this.moduleType = moduleType;
	this.templates = templates || ["*"];
}
module.exports = ModuleAsDirectoryPlugin;

ModuleAsDirectoryPlugin.prototype.apply = function(resolver) {
	var templates = this.templates;
	resolver.plugin("module-" + this.moduleType, function(request, callback) {
		var fs = this.fileSystem;
		var i = request.request.indexOf("/"),
			j = request.request.indexOf("\\");
		var p = i < 0 ? j : j < 0 ? i : i < j ? i : j;
		var moduleName, remainingRequest;
		if(p < 0) {
			moduleName = request.request;
			remainingRequest = "";
		} else {
			moduleName = request.request.substr(0, p);
			remainingRequest = request.request.substr(p+1);
		}
		function applyTemplates(callback) {
			this.forEachBail(templates, function(template, callback) {
				var modulePath = this.join(request.path, template.replace(/\*/g, moduleName));
				fs.stat(modulePath, function(err, stat) {
					if(err || !stat) return callback();
					if(stat.isFile() || stat.isDirectory()) {
						return this.doResolve(request.directory ? "directory" : ["file", "directory"], {
							path: modulePath,
							request: remainingRequest,
							query: request.query
						}, callback);
					}
					return callback();
				}.bind(this));
			}.bind(this), callback);
		}
		if(remainingRequest) {
			applyTemplates.call(this, callback);
		} else {
			this.forEachBail(request.directory ? "directory" : ["file", "directory"], function(method, callback) {
				if(method == "file") {
					return this.doResolve("file", {
						path: modulePath,
						request: remainingRequest,
						query: request.query
					}, function(err, result) {
						if(!err && result) return callback(null, result);
						return callback();
					});
				} else {
					applyTemplates.call(this, callback);
				}
			}.bind(this), callback);
		}
	});
};
