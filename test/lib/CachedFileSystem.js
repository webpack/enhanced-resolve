function CachedFileSystem(fs) {
	this.fs = fs;
	this.cache = {
		readFile: {},
		readdir: {},
		stat: {}
	};
}
module.exports = CachedFileSystem;

CachedFileSystem.prototype.readdirSync = function(path) {
	if(this.cache.readdir[path]) return this.cache.readdir[path];
	return this.cache.readdir[path] = this.fs.readdirSync(path);
}

CachedFileSystem.prototype.readFileSync = function(path, encoding) {
	if(this.cache.readFile[path]) return this.cache.readFile[path];
	return this.cache.readFile[path] = this.fs.readFileSync(path, encoding);
}

CachedFileSystem.prototype.statSync = function(path) {
	if(this.cache.stat[path]) return this.cache.stat[path];
	return this.cache.stat[path] = this.fs.statSync(path);
}