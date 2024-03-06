/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver").FileSystem} FileSystem */
/** @typedef {import("./Resolver").Dirent} Dirent */
/** @typedef {import("./Resolver").SyncFileSystem} SyncFileSystem */

/**
 * @param {SyncFileSystem} fs file system implementation
 * @constructor
 */
function SyncAsyncFileSystemDecorator(fs) {
	this.fs = fs;

	this.lstat = undefined;
	this.lstatSync = undefined;
	const lstatSync = fs.lstatSync;
	if (lstatSync) {
		this.lstat =
			/** @type {FileSystem["lstat"]} */
			(
				(arg, options, callback) => {
					let result;
					try {
						result = lstatSync.call(fs, arg);
					} catch (e) {
						return (callback || options)(e);
					}

					(callback || options)(null, result);
				}
			);
		this.lstatSync =
			/** @type {SyncFileSystem["lstatSync"]} */
			((arg, options) => lstatSync.call(fs, arg, options));
	}

	this.stat =
		/** @type {FileSystem["stat"]} */
		(
			(arg, options, callback) => {
				let result;
				try {
					result = callback ? fs.statSync(arg, options) : fs.statSync(arg);
				} catch (e) {
					return (callback || options)(e);
				}
				(callback || options)(null, result);
			}
		);
	this.statSync =
		/** @type {SyncFileSystem["statSync"]} */
		((arg, options) => fs.statSync(arg, options));

	this.readdir =
		/** @type {FileSystem["readdir"]} */
		(
			(arg, options, callback) => {
				let result;
				try {
					result = callback
						? fs.readdirSync(arg, options)
						: fs.readdirSync(arg);
				} catch (e) {
					return (callback || options)(e);
				}

				(callback || options)(null, result);
			}
		);
	this.readdirSync =
		/** @type {SyncFileSystem["readdirSync"]} */
		((arg, options) => fs.readdirSync(arg, options));

	this.readFile =
		/** @type {FileSystem["readFile"]} */
		(
			(arg, options, callback) => {
				let result;
				try {
					result = fs.readFileSync(arg);
				} catch (e) {
					return (callback || options)(e);
				}
				(callback || options)(null, result);
			}
		);
	this.readFileSync =
		/** @type {SyncFileSystem["readFileSync"]} */
		((arg, options) => fs.readFileSync(arg, options));

	this.readlink =
		/** @type {FileSystem["readlink"]} */
		(
			(arg, options, callback) => {
				let result;
				try {
					result = fs.readlinkSync(arg);
				} catch (e) {
					return (callback || options)(e);
				}
				(callback || options)(null, result);
			}
		);
	this.readlinkSync =
		/** @type {SyncFileSystem["readlinkSync"]} */
		((arg, options) => fs.readlinkSync(arg, options));

	this.readJson = undefined;
	this.readJsonSync = undefined;
	const readJsonSync = fs.readJsonSync;
	if (readJsonSync) {
		this.readJson =
			/** @type {NonNullable<FileSystem["readJson"]>} */
			(
				(arg, options, callback) => {
					let result;
					try {
						result = readJsonSync.call(fs, arg);
					} catch (e) {
						return (callback || options)(e);
					}
					(callback || options)(null, result);
				}
			);
		this.readJsonSync =
			/** @type {SyncFileSystem["readJsonSync"]} */
			((arg, options) => readJsonSync.call(fs, arg, options));
	}

	this.realpath = undefined;
	this.realpathSync = undefined;
	const realpathSync = fs.realpathSync;
	if (realpathSync) {
		this.realpath =
			/** @type {FileSystem["realpath"]} */
			(
				(arg, options, callback) => {
					let result;
					try {
						result = realpathSync.call(fs, arg);
					} catch (e) {
						return (callback || options)(e);
					}
					(callback || options)(null, result);
				}
			);
		this.realpathSync =
			/** @type {SyncFileSystem["realpathSync"]} */
			((arg, options) => realpathSync.call(fs, arg, options));
	}
}
module.exports = SyncAsyncFileSystemDecorator;
