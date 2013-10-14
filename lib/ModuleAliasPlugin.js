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
				if(request.request.indexOf(aliasName + "/") === 0 || request.request === aliasName) {
					var aliasValue = aliasMap[aliasName];
					if(request.request.indexOf(aliasValue + "/") !== 0 && request.request != aliasValue) {
						var resolveWithAlias = function() {
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
						}.bind(this);
						if(request.request !== aliasName) {
							// Check if aliasValue resolves to a file.
							// If it do so, we do not alias the module as the user
							//  only want to alias the module as directory
							var newRequest = this.parse(aliasValue);
							return this.doResolve("file", {
								path: request.path,
								request: newRequest.path,
								query: newRequest.query,
								directory: newRequest.directory
							}, function(err, result) {
								if(!err && result) return i++, next.call(this);
								return resolveWithAlias();
							}.bind(this));
						} else return resolveWithAlias();
					}
				}
			}
			return callback();
		}.call(this));
	});
};
