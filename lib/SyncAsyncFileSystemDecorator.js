/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

function SyncAsyncFileSystemDecorator(fs) {
	this.fs = fs;
	if (fs.statSync) {
		this.stat = function(arg, callback) {
			let result;
			try {
				result = fs.statSync(arg);
			} catch (e) {
				return callback(e);
			}
			callback(null, result);
		};

		this.statSync = function(arg) {
			return fs.statSync(arg);
		};
	}
	if (fs.readdirSync) {
		this.readdir = function(arg, callback) {
			let result;
			try {
				result = fs.readdirSync(arg);
			} catch (e) {
				return callback(e);
			}
			callback(null, result);
		};

		this.readdirSync = function(arg) {
			return fs.readdirSync(arg);
		};
	}
	if (fs.readFileSync) {
		this.readFile = function(arg, callback) {
			let result;
			try {
				result = fs.readFileSync(arg);
			} catch (e) {
				return callback(e);
			}
			callback(null, result);
		};

		this.readFileSync = function(arg) {
			return fs.readFileSync(arg);
		};
	}
	if (fs.readlinkSync) {
		this.readlink = function(arg, callback) {
			let result;
			try {
				result = fs.readlinkSync(arg);
			} catch (e) {
				return callback(e);
			}
			callback(null, result);
		};

		this.readlinkSync = function(arg) {
			return fs.readlinkSync(arg);
		};
	}
	if (fs.readJsonSync) {
		this.readJson = function(arg, callback) {
			let result;
			try {
				result = fs.readJsonSync(arg);
			} catch (e) {
				return callback(e);
			}
			callback(null, result);
		};

		this.readJsonSync = function(arg) {
			return fs.readJsonSync(arg);
		};
	}
}
module.exports = SyncAsyncFileSystemDecorator;
