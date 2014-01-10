/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ModuleAliasPlugin(aliasMap) {
	this.aliasMap = aliasMap;
}
module.exports = ModuleAliasPlugin;

ModuleAliasPlugin.prototype.apply = function(resolver) {
	var aliasMap = this.aliasMap;
	resolver.plugin("module", function(request, callback) {
		var fs = this.fileSystem;
		var keys = Object.keys(aliasMap);
		var i = 0;
		(function next() {
			for(;i < keys.length; i++) {
				var aliasName = keys[i];
				var onlyModule = /\$$/.test(aliasName);
				if(onlyModule) aliasName = aliasName.substr(0, aliasName.length-1);
				if((!onlyModule && request.request.indexOf(aliasName + "/") === 0) || request.request === aliasName) {
					var aliasValue = aliasMap[keys[i]];
					if(request.request.indexOf(aliasValue + "/") !== 0 && request.request != aliasValue) {
						var newRequest = this.parse(aliasValue + request.request.substr(aliasName.length));
						var obj = {
							path: request.path,
							request: newRequest.path,
							query: newRequest.query,
							directory: newRequest.directory
						};
						if(newRequest.module) return this.doResolve("module", obj, callback);
						if(newRequest.directory) return this.doResolve("directory", obj, callback);
						return this.doResolve(["file", "directory"], obj, callback);
					}
				}
			}
			return callback();
		}.call(this));
	});
};
