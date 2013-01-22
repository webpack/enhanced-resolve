/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
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
			if(err) return callback(err);
			if(!stat || !stat.isDirectory()) return callback();
			return callback(null, {
				path: directory,
				query: request.query,
				resolved: true,
				directory: true
			});
		});
	});
};