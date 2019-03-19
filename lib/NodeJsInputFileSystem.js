/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const defaultFs = require("graceful-fs");

const fsMethods = [
	"stat",
	"statSync",
	"readFile",
	"readFileSync",
	"readlink",
	"readlinkSync"
];

class NodeJsInputFileSystem {
	constructor(fs) {
		var fileSystem = (this.fs = fs || defaultFs);
		for (const key of fsMethods) {
			Object.defineProperty(this, key, {
				configurable: true,
				writable: true,
				value: fileSystem[key].bind(fileSystem)
			});
		}
	}
	readdir(path, callback) {
		this.fs.readdir(path, (err, files) => {
			callback(
				err,
				files &&
					files.map(file => {
						return file.normalize ? file.normalize("NFC") : file;
					})
			);
		});
	}

	readdirSync(path) {
		const files = this.fs.readdirSync(path);
		return (
			files &&
			files.map(file => {
				return file.normalize ? file.normalize("NFC") : file;
			})
		);
	}
}

module.exports = NodeJsInputFileSystem;
