/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function DirectoryDefaultFilePlugin(files) {
	this.files = files;
}
module.exports = DirectoryDefaultFilePlugin;

DirectoryDefaultFilePlugin.prototype.apply = function(resolver) {
	var files = this.files;
	resolver.plugin("directory", function(request, callback) {
		var fs = this.fileSystem;
		var directory = this.join(request.path, request.request);
		fs.stat(directory, function(err, stat) {
			if(err || !stat || !stat.isDirectory()) return callback();
			this.forEachBail(files, function(file, callback) {
				this.doResolve("file", {
					path: directory,
					query: request.query,
					request: file
				}, function(err, result) {
					if(!err && result) return callback(result);
					return callback();
				});
			}.bind(this), function(result) {
				if(!result) return callback();
				return callback(null, result);
			});
		}.bind(this));
	});
};