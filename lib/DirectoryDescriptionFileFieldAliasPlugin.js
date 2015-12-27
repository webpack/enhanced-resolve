/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var createInnerCallback = require("./createInnerCallback");
var DescriptionFileUtils = require("./DescriptionFileUtils");
var cdUp = DescriptionFileUtils.cdUp;
var assign = require("object-assign");

function DirectoryDescriptionFileFieldAliasPlugin(filenames, field) {
	this.filenames = [].concat(filenames);
	this.field = field;
}
module.exports = DirectoryDescriptionFileFieldAliasPlugin;

DirectoryDescriptionFileFieldAliasPlugin.prototype.apply = function(resolver) {
	var filenames = this.filenames;
	var field = this.field;
	resolver.plugin("module", function(request, callback) {
		var directory = request.path;
		var moduleName = request.request;
		DescriptionFileUtils.assignDescriptionFile(this, request, directory, filenames, function(err, request) {
			if(err) return callback(err);
			var fieldData = DescriptionFileUtils.getField(request.descriptionFileData, field);
			var directory = request.descriptionFileRoot;
			if(!fieldData) return callback();
			var data = fieldData[moduleName];
			if(data === moduleName) return callback();
			if(data === false) return callback(null, {
				path: false,
				resolved: true
			});
			if(!data) return callback();
			var newRequest = this.parse(data);
			var obj = assign({}, request, {
				path: directory,
				request: newRequest.path,
				query: newRequest.query,
				directory: newRequest.directory
			});
			var newCallback = createInnerCallback(callback, callback, "aliased from directory description file " + request.descriptionFilePath + " with mapping " + JSON.stringify(moduleName));
			if(newRequest.module) return this.doResolve("module", obj, newCallback);
			if(newRequest.directory) return this.doResolve("directory", obj, newCallback);
			return this.doResolve(["file", "directory"], obj, newCallback);
		}.bind(this));
	});
	resolver.plugin("result", function(request, callback) {
		var directory = cdUp(request.path);
		var requestPath = request.path;
		DescriptionFileUtils.assignDescriptionFile(this, request, directory, filenames, function(err, request) {
			if(err) return callback(err);
			var fieldData = DescriptionFileUtils.getField(request.descriptionFileData, field);
			var directory = request.descriptionFileRoot;
			if(!fieldData) return callback();
			var relative = requestPath.substr(directory.length + 1).replace(/\\/g, "/");
			var data;
			if(typeof fieldData[relative] !== "undefined")
				data = fieldData[relative];
			else if(typeof fieldData["./" + relative] !== "undefined")
				data = fieldData["./" + relative];
			if(data === relative || data === "./" + relative) return callback();
			if(data === false) return callback(null, {
				path: false,
				resolved: true
			});
			if(!data) return callback();
			var newRequest = this.parse(data);
			var obj = assign({}, request, {
				path: directory,
				request: newRequest.path,
				query: newRequest.query,
				directory: newRequest.directory
			});
			var newCallback = createInnerCallback(callback, callback, "aliased from directory description file " + request.descriptionFilePath + " with mapping " + JSON.stringify(relative));
			if(newRequest.module) return this.doResolve("module", obj, newCallback);
			if(newRequest.directory) return this.doResolve("directory", obj, newCallback);
			return this.doResolve(["file", "directory"], obj, newCallback);
		}.bind(this));
	});
};
