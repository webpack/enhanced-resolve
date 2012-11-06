function AsyncFileSystem(fs) {
	this.fs = fs;
}
module.exports = AsyncFileSystem;

function asAsync(fn, callback) {
	try {
		var result = fn();
		process.nextTick(function() {
			callback(null, result);
		});
	} catch(e) {
		process.nextTick(function() {
			callback(e);
		});
	}
}

AsyncFileSystem.prototype.readdir = function(path, callback) {
	asAsync(function() {
		return this.fs.readdirSync(path);
	}.bind(this), callback);
}

AsyncFileSystem.prototype.readFile = function(path, encoding, callback) {
	asAsync(function() {
		return this.fs.readFileSync(path, encoding);
	}.bind(this), callback);
}

AsyncFileSystem.prototype.stat = function(path, callback) {
	asAsync(function() {
		return this.fs.statSync(path);
	}.bind(this), callback);
}