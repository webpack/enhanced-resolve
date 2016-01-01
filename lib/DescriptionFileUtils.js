/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var assign = require("object-assign");
var forEachBail = require("./forEachBail");

function loadDescriptionFile(resolver, directory, filenames, callback) {
	(function findDescriptionFile() {
		forEachBail(filenames, function(filename, callback) {
			var descriptionFilePath = resolver.join(directory, filename);
			resolver.fileSystem.readFile(descriptionFilePath, function(err, content) {
				if(err) {
					return callback();
				}
				try {
					content = JSON.parse(content);
				} catch(e) {
					if(callback.log)
						callback.log(descriptionFilePath + " (directory description file): " + e);
					else
						e.message = descriptionFilePath + " (directory description file): " + e;
					return callback(e);
				}
				callback(null, {
					content: content,
					directory: directory,
					path: descriptionFilePath
				});
			});
		}, function(err, result) {
			if(err) return callback(err);
			if(result) {
				return callback(null, result)
			} else {
				directory = cdUp(directory);
				if(!directory) {
					return callback();
				} else {
					return findDescriptionFile();
				}
			}
		});
	}());
}

function getField(content, field) {
	if(!content) return undefined;
	if(Array.isArray(field)) {
		var current = content;
		for(var j = 0; j < field.length; j++) {
			if(current === null || typeof current !== "object") {
				current = null;
				break;
			}
			current = current[field[j]];
		}
		if(typeof current === "object") {
			return current;
		}
	} else {
		if(typeof content[field] === "object") {
			return content[field];
		}
	}
}

function assignDescriptionFile(resolver, request, directory, filenames, callback) {
	if(request.descriptionFileData && request.descriptionFile) {
		return callback(null, request);
	}

	function childCallback(err, result) {
		if(err) return callback(err);
		if(!result) return callback(null, request);
		var obj = assign({
			descriptionFile: result.path,
			descriptionFileRoot: result.directory,
			descriptionFileData: result.content
		}, request);
		callback(null, obj);
	}
	childCallback.log = callback.log;
	loadDescriptionFile(resolver, directory, filenames, childCallback);
}

function cdUp(directory) {
	if(directory === "/") return null;
	var i = directory.lastIndexOf("/"),
		j = directory.lastIndexOf("\\");
	var p = i < 0 ? j : j < 0 ? i : i < j ? j : i;
	if(p < 0) return null;
	return directory.substr(0, p || 1);
}

exports.loadDescriptionFile = loadDescriptionFile;
exports.getField = getField;
exports.assignDescriptionFile = assignDescriptionFile;
exports.cdUp = cdUp;
