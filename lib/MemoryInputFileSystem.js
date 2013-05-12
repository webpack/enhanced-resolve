/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function MemoryInputFileSystem(data) {
	this.data = data || {};
}
module.exports = MemoryInputFileSystem;

MemoryInputFileSystem.prototype.stat = function(path, callback) {
	try {
		return callback(null, this.statSync(path));
	} catch(e) {
		return callback(e);
	}
};

MemoryInputFileSystem.prototype.readdir = function(path, callback) {
	try {
		return callback(null, this.readdirSync(path));
	} catch(e) {
		return callback(e);
	}
};

MemoryInputFileSystem.prototype.readFile = function(path, callback) {
	try {
		return callback(null, this.readFileSync(path));
	} catch(e) {
		return callback(e);
	}
};

function isDir(item) {
	if(typeof item != "object") return false;
	return item[""] === true;
}

function isFile(item) {
	if(typeof item == "string") return true;
	if(typeof item != "object") return false;
	return !item[""];
}

function pathToArray(path) {
	var nix = /^\//.test(path);
	if(!nix) {
		if(!/^[A-Za-z]:\\/.test(path)) throw new Error("Invalid path " + path);
		path = path.replace(/\\/g, "/");
	}
	path = path.replace(/\/+/g, "/"); // multi slashs
	path = (nix ? path.substr(1) : path).split("/");
	return path;
}

function trueFn() { return true }
function falseFn() { return false }

MemoryInputFileSystem.prototype.statSync = function(_path) {
	var path = pathToArray(_path);
	var current = this.data;
	for(var i = 0; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			throw new Error("Path doesn't exists " + _path);
		current = current[path[i]];
	}
	if(isDir(current[path[i]])) {
		return {
			isFile: falseFn,
			isDirectory: trueFn,
			isBlockDevice: falseFn,
			isCharacterDevice: falseFn,
			isSymbolicLink: falseFn,
			isFIFO: falseFn,
			isSocket: falseFn
		};
	} else if(isFile(current[path[i]])) {
		return {
			isFile: trueFn,
			isDirectory: falseFn,
			isBlockDevice: falseFn,
			isCharacterDevice: falseFn,
			isSymbolicLink: falseFn,
			isFIFO: falseFn,
			isSocket: falseFn
		};
	} else
		throw new Error("Path doesn't exists " + _path);
};

MemoryInputFileSystem.prototype.readFileSync = function(_path) {
	var path = pathToArray(_path);
	var current = this.data;
	for(var i = 0; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			throw new Error("Path doesn't exists " + _path);
		current = current[path[i]];
	}
	if(!isFile(current[path[i]])) {
		if(isDir(current[path[i]]))
			throw new Error("Cannot readFile on directory " + _path);
		else
			throw new Error("File doesn't exists " + _path);
	}
	return current[path[i]];
};

MemoryInputFileSystem.prototype.readdirSync = function(_path) {
	var path = pathToArray(_path);
	var current = this.data;
	for(var i = 0; i < path.length - 1; i++) {
		if(!isDir(current[path[i]]))
			throw new Error("Path doesn't exists " + _path);
		current = current[path[i]];
	}
	if(!isDir(current[path[i]])) {
		if(isFile(current[path[i]]))
			throw new Error("Cannot readFile on file " + _path);
		else
			throw new Error("File doesn't exists " + _path);
	}
	return Object.keys(current[path[i]]).filter(Boolean);
};
