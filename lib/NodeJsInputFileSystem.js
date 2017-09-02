"use strict";
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const fs = require("graceful-fs");

class NodeJsInputFileSystem {
	get stat() {
		return fs.stat.bind(fs);
	}

	readdir(path, callback) {
		fs.readdir(path, (err, files) => {
			callback(err, files && files.map((file) =>
				file.normalize ? file.normalize("NFC") : file
			));
		});
	}

	get readFile() {
		return fs.readFile.bind(fs);
	}

	get readlink() {
		return fs.readlink.bind(fs);
	}

	readdirSync(path) {
		const files = fs.readdirSync(path);
		return files && files.map((file) =>
			file.normalize ? file.normalize("NFC") : file
		);
	}

	get statSync() {
		return fs.statSync.bind(fs);
	}

	get readFileSync() {
		return fs.readFileSync.bind(fs);
	}

	get readlinkSync() {
		return fs.readlinkSync.bind(fs);
	}
}
module.exports = NodeJsInputFileSystem;
