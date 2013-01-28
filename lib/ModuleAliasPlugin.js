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
		var keys = Object.keys(aliasMap)
		for(var i = 0; i < keys.length; i++) {
			var aliasName = keys[i];
			if(request.request.indexOf(aliasName) === 0) {
				var aliasValue = aliasMap[aliasName];
				if(request.request.indexOf(aliasValue) !== 0) {
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
	});
};
