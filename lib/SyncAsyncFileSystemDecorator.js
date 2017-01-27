"use"
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const fs = require("graceful-fs");

function SyncAsyncFileSystemDecorator(fs) {
	this.fs = fs;
	if(fs.statSync) {
		this.stat = (arg, callback) => {
			try {
				var result = fs.statSync(arg);
			} catch(e) {
				return callback(e);
			}
			callback(null, result);
		};
	}
	if(fs.readdirSync) {
		this.readdir = (arg, callback) => {
			try {
				var result = fs.readdirSync(arg);
			} catch(e) {
				return callback(e);
			}
			callback(null, result);
		};
	}
	if(fs.readFileSync) {
		this.readFile = (arg, callback) => {
			try {
				var result = fs.readFileSync(arg);
			} catch(e) {
				return callback(e);
			}
			callback(null, result);
		};
	}
	if(fs.readlinkSync) {
		this.readlink = (arg, callback) => {
			try {
				var result = fs.readlinkSync(arg);
			} catch(e) {
				return callback(e);
			}
			callback(null, result);
		};
	}
	if(fs.readJsonSync) {
		this.readJson = (arg, callback) => {
			try {
				var result = fs.readJsonSync(arg);
			} catch(e) {
				return callback(e);
			}
			callback(null, result);
		};
	}
}
module.exports = SyncAsyncFileSystemDecorator;
