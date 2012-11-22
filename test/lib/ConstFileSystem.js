function ConstFileSystem(content) {
	this.content = content;
}
module.exports = ConstFileSystem;

ConstFileSystem.prototype.get = function(path) {
	if(path == "/") return this.content;
	var seqments = path.split(/[\/\\]/g);
	if(seqments[0] != "") throw new Error("path is not absolute");
	var current = this.content;
	var i = 1;
	while(typeof current != "undefined" && i < seqments.length) {
		current = current[seqments[i++]];
	}
	if(typeof current == "undefined") throw new Error("path not found");
	return current;
}

ConstFileSystem.prototype.readdirSync = function(path) {
	var dir = this.get(path);
	if(typeof dir != "object") throw new Error("readdir: path is not a directory");
	return Object.keys(dir);
}

ConstFileSystem.prototype.readFileSync = function(path, encoding) {
	if(encoding != "utf-8") throw new Error("readFile: only utf-8 encoding is supported");
	var file = this.get(path);
	if(typeof file != "string") throw new Error("readFile: path is not a file");
	return file;
}

ConstFileSystem.prototype.statSync = function(path) {
	var item = this.get(path);
	var isDir = typeof item == "object";
	var isFile = typeof item == "string";
	return {
		isFile: isFile?trueFn:falseFn,
		isDirectory: isDir?trueFn:falseFn,
		isBlockDevice: falseFn,
		isCharacterDevice: falseFn,
		isSymbolicLink: falseFn,
		isFIFO: falseFn,
		isSocket: falseFn
	}
}

function trueFn() { return true }
function falseFn() { return false }
