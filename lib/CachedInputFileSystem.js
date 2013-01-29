/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function Storage(duration) {
	this.duration = duration;
	this.running = {};
	this.data = {};
	this.levels = duration > 0 ? [[], [], [], [], []] : [];
	this.count = 0;
	this.interval = null;
}

Storage.prototype.ensureTick = function() {
	if(!this.interval && this.duration > 0)
		this.interval = setInterval(this.tick.bind(this), Math.floor(this.duration / this.levels.length));
};

Storage.prototype.finished = function(name) {
	var args = Array.prototype.slice.call(arguments, 1);
	var callbacks = this.running[name];
	delete this.running[name];
	if(this.duration > 0) {
		this.count++;
		this.data[name] = args;
		this.levels[0].push(name);
		this.ensureTick();
	}
	for(var i = 0; i < callbacks.length; i++) {
		callbacks[i].apply(null, args);
	}
};

Storage.prototype.provide = function(name, provider, callback) {
	var running = this.running[name];
	if(running) {
		running.push(callback);
		return;
	}
	if(this.duration > 0) {
		var data = this.data[name];
		if(data) {
			return callback.apply(null, data);
		}
	}
	this.running[name] = running = [callback];
	provider(name, this.finished.bind(this, name));
};

Storage.prototype.tick = function() {
	var decay = this.levels.pop();
	for(var i = decay.length - 1; i >= 0; i--) {
		delete this.data[decay[i]];
	}
	this.count -= decay.length;
	if(this.count == 0) {
		clearInterval(this.interval);
		this.interval = null;
	}
	decay.length = 0;
	this.levels.unshift(decay);
};

Storage.prototype.purge = function() {
	this.count = 0;
	clearInterval(this.interval);
	this.data = {};
	this.levels.forEach(function(level) {
		level.length = 0;
	});
};


function CachedInputFileSystem(fileSystem, duration) {
	this.fileSystem = fileSystem;
	this._statStorage = new Storage(duration);
	this._readdirStorage = new Storage(duration);
	this._readFileStorage = new Storage(duration);
}
module.exports = CachedInputFileSystem;

CachedInputFileSystem.prototype.isSync = function() {
	return this.fileSystem.isSync();
};

CachedInputFileSystem.prototype.stat = function(path, callback) {
	this._statStorage.provide(path, this.fileSystem.stat.bind(this.fileSystem), callback);
};

CachedInputFileSystem.prototype.readdir = function(path, callback) {
	this._readdirStorage.provide(path, this.fileSystem.readdir.bind(this.fileSystem), callback);
};

CachedInputFileSystem.prototype.readFile = function(path, callback) {
	this._readFileStorage.provide(path, this.fileSystem.readFile.bind(this.fileSystem), callback);
};

CachedInputFileSystem.prototype.purge = function() {
	this._statStorage.purge();
	this._readdirStorage.purge();
	this._readFileStorage.purge();
};