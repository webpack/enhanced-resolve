/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var assign = require("object-assign");

function DirectoryResultPlugin(files) {
	this.files = files;
}
module.exports = DirectoryResultPlugin;

DirectoryResultPlugin.prototype.apply = function(resolver) {
	var files = this.files;
	resolver.plugin("directory", function(request, callback) {
		var fs = this.fileSystem;
		var directory = this.join(request.path, request.request);
		fs.stat(directory, function(err, stat) {
			if(!err && stat && stat.isDirectory()) {
				var obj = assign({}, request, {
					path: directory,
					query: request.query,
					directory: true,
					resolved: true
				});
				return this.doResolve("result", obj, callback);
			}
			if(callback.log) {
				if(err) callback.log(directory + " doesn't exist");
				else callback.log(directory + " is not a directory");
			}
			return callback();
		}.bind(this));
	});
};
