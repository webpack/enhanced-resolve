/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @param {Object} fs file system implementation
 * @constructor
 */
function SyncAsyncFileSystemDecorator(fs) {
	/**
	 * @type {Object}
	 */
	this.fs = fs;
	if (fs.statSync) {
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
	}
	if (fs.readdirSync) {
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
	}
	if (fs.readFileSync) {
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
	}
	if (fs.readlinkSync) {
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
	}
	if (fs.readJsonSync) {
		this.readJson = (arg, callback) => {
			let result;
			try {
				result = fs.readJsonSync(arg);
			} catch (e) {
				return callback(e);
			}
			callback(null, result);
		};

		this.readJsonSync = arg => fs.readJsonSync(arg);
	}
}
module.exports = SyncAsyncFileSystemDecorator;
