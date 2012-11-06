function DebugFileSystem(fs) {
	this.fs = fs;
}
module.exports = DebugFileSystem;

DebugFileSystem.prototype.readdirSync = function(path) {
	console.log("readdir " + path);
	return this.fs.readdirSync(path);
}

DebugFileSystem.prototype.readFileSync = function(path, encoding) {
	console.log("readFile " + path);
	return this.fs.readFileSync(path, encoding);
}

DebugFileSystem.prototype.statSync = function(path) {
	console.log("stat " + path);
	return this.fs.statSync(path);
}