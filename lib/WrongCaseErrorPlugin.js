/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");

module.exports = class WrongCaseErrorPlugin {
	constructor(source) {
		this.source = source;
		this._fsInfo = {
			checked: false,
			caseInsensitive: false,
		};
	}

	checkFS(fs) {
		if(!this._fsInfo.checked) {
			try {
				const upperStat = fs.statSync(process.execPath.toUpperCase());
				const lowerStat = fs.statSync(process.execPath.toLowerCase());
				if(upperStat.dev === lowerStat.dev && upperStat.ino === lowerStat.ino) {
					this._fsInfo.caseInsensitive = true;
				}
			} catch(e) {}
			this._fsInfo.checked = true;
		}
		return this._fsInfo;
	}
	matchFileWithCaseInsensitive(fs, filepath, dirname, filename) {
		if(dirname === filepath) return;
		try {
			const list = fs.readdirSync(dirname);
			const lowerFilename = filename.toLowerCase();
			const matchedName = list.find(name => name !== filename && name.toLowerCase() === lowerFilename);
			if(matchedName) {
				return {
					usedName: filename,
					matchedName: matchedName,
					matchedNameDir: dirname,
				};
			}
		} catch(e) {}
		return this.matchFileWithCaseInsensitive(fs, dirname, path.dirname(dirname), path.basename(dirname));
	}
	apply(resolver) {
		const fs = resolver.fileSystem;
		this.source.tap("NoResolvePlugin", (request, error) => {
			const fsInfo = this.checkFS(fs);
			// Check if used wrong case path
			if(!fsInfo.caseInsensitive) {
				const missing = error.missing;
				const checkedDir = new Set();
				let i = 0;
				let matchedFile;
				while(i < missing.length && !matchedFile) {
					const checkFile = missing[i];
					const checkDir = path.dirname(checkFile);
					const checkName = path.basename(checkFile);
					if(checkedDir.has(checkDir)) {
						i++;
						continue;
					}
					checkedDir.add(checkDir);
					matchedFile = this.matchFileWithCaseInsensitive(fs, checkFile, checkDir, checkName);
					if(matchedFile) {
						error.message += ("You may be using a wrong case path which the '" +
							matchedFile.usedName +
							"' is not found but the '" +
							matchedFile.matchedName +
							"' is. (in: " + checkFile + ")");
						break;
					}
					i++;
				}
			}
		});
	}
};
