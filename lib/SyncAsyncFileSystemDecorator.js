/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver").FileSystem} FileSystem */
/** @typedef {import("./Resolver").SyncFileSystem} SyncFileSystem */

/**
 * @param {SyncFileSystem} fs file system implementation
 * @constructor
 */
function SyncAsyncFileSystemDecorator(fs) {
	this.fs = fs;

	this.lstat = (arg, callback) => {
		let result;
		try {
			result = fs.lstatSync(arg);
		} catch (e) {
			return callback(e);
		}
		callback(null, result);
	};
	this.lstatSync = arg => fs.lstatSync(arg);

	this.stat = (arg, callback) => {
		let result;
		try {
			result = fs.statSync(arg);
		} catch (e) {
			return callback(e);
		}
		callback(null, result);
	};
	this.statSync = arg => fs.statSync(arg);

	this.readdir = (arg, callback) => {
		let result;
		try {
			result = fs.readdirSync(arg);
		} catch (e) {
			return callback(e);
		}
		callback(null, result);
	};
	this.readdirSync = arg => fs.readdirSync(arg);

	this.readFile = (arg, callback) => {
		let result;
		try {
			result = fs.readFileSync(arg);
		} catch (e) {
			return callback(e);
		}
		callback(null, result);
	};
	this.readFileSync = arg => fs.readFileSync(arg);

	this.readlink = (arg, callback) => {
		let result;
		try {
			result = fs.readlinkSync(arg);
		} catch (e) {
			return callback(e);
		}
		callback(null, result);
	};
	this.readlinkSync = arg => fs.readlinkSync(arg);

	this.readJson = undefined;
	this.readJsonSync = undefined;
	const readJsonSync = fs.readJsonSync;
	if (readJsonSync) {
		this.readJson = (arg, callback) => {
			let result;
			try {
				result = readJsonSync.call(fs, arg);
			} catch (e) {
				return callback(e);
			}
			callback(null, result);
		};

		this.readJsonSync = arg => readJsonSync.call(fs, arg);
	}
}
module.exports = SyncAsyncFileSystemDecorator;
