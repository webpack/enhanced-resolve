function LoggedFileSystem(fs) {
	this.fs = fs;
	this.count = {
		readFile: 0,
		readdir: 0,
		stat: 0
	};
}
module.exports = LoggedFileSystem;

LoggedFileSystem.prototype.readdirSync = function(path) {
	this.count.readdir++;
	return this.fs.readdirSync(path);
}

LoggedFileSystem.prototype.readFileSync = function(path, encoding) {
	this.count.readFile++;
	return this.fs.readFileSync(path, encoding);
}

LoggedFileSystem.prototype.statSync = function(path) {
	this.count.stat++;
	return this.fs.statSync(path);
}