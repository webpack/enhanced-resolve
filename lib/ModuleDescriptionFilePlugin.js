/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ModuleDescriptionFilePlugin(filename, fields) {
	this.filename = filename;
	this.fields = fields;
}
module.exports = ModuleDescriptionFilePlugin;

ModuleDescriptionFilePlugin.prototype.apply = function(resolver) {
	var filename = this.filename;
	var fields = this.fields;
	resolver.plugin("directory", function(request, callback) {
		var fs = this.fileSystem;
		var directory = this.join(request.path, request.request);
		fs.readFile(this.join(directory, filename), function(err, content) {
			if(err) return callback();
			content = content.toString("utf-8");
			try {
				content = JSON.parse(content);
			} catch(e) {
				return callback(e);
			}
			var mainModule;
			for(var i = 0; i < fields.length; i++) {
				if(Array.isArray(fields[i])) {
					var current = content;
					for(var j = 0; j < fields[i].length; j++) {
						if(current === null || typeof current !== "object") {
							current = null;
							break;
						}
						var field = fields[i][j];
						current = current[field];
					}
					if(current) {
						mainModule = current;
						i = fields.length;
						break;
					}
				} else {
					var field = fields[i];
					if(content[field]) {
						mainModule = content[field];
						break;
					}
				}
			}
			if(mainModule) {
				return this.doResolve(["file", "directory"], {
					path: directory,
					query: request.query,
					request: mainModule
				}, callback);
			}
			return callback();
		}.bind(this));
	});
};