/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const forEachBailPromise = require("./forEachBailPromise");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").JsonObject} JsonObject */
/** @typedef {import("./Resolver").JsonValue} JsonValue */
/** @typedef {import("./Resolver").ResolveContext} ResolveContext */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */

/**
 * @typedef {object} DescriptionFileInfo
 * @property {JsonObject=} content content
 * @property {string} path path
 * @property {string} directory directory
 */

/**
 * @typedef {object} Result
 * @property {string} path path to description file
 * @property {string} directory directory of description file
 * @property {JsonObject} content content of description file
 */

const CHAR_SLASH = 47;
const CHAR_BACKSLASH = 92;

/**
 * Walk up one directory. Called once per package-root candidate and once per
 * `described-resolve` (to find the enclosing description file), so it's on
 * the resolver's hot path.
 *
 * Previous implementation called `lastIndexOf("/")` and `lastIndexOf("\\")`
 * separately and then picked the larger. For any non-trivial directory
 * string on POSIX, `lastIndexOf("\\")` scans the full string just to return
 * -1. A single reverse char-code scan does the same work in one pass.
 * @param {string} directory directory
 * @returns {string | null} parent directory or null
 */
function cdUp(directory) {
	if (directory === "/") return null;
	for (let i = directory.length - 1; i >= 0; i--) {
		const code = directory.charCodeAt(i);
		if (code === CHAR_SLASH || code === CHAR_BACKSLASH) {
			return directory.slice(0, i || 1);
		}
	}
	return null;
}

/**
 * Read a description file from disk and return its parsed JSON content.
 * Resolves with `null` if the file is missing. Rejects with the underlying
 * error for malformed content or unexpected I/O failures — the caller
 * decides whether to log or re-throw.
 * @param {Resolver} resolver resolver
 * @param {string} descriptionFilePath path
 * @returns {Promise<JsonObject | null>} parsed JSON content or null
 */
function readDescriptionFile(resolver, descriptionFilePath) {
	const { fileSystem } = resolver;
	if (fileSystem.readJson) {
		return new Promise((resolve, reject) => {
			/** @type {import("./Resolver").FileSystem["readJson"]} */
			(fileSystem.readJson)(descriptionFilePath, (err, content) => {
				if (err) {
					if (
						typeof (/** @type {NodeJS.ErrnoException} */ (err).code) !==
						"undefined"
					) {
						resolve(null);
						return;
					}
					reject(err);
					return;
				}
				resolve(/** @type {JsonObject} */ (content));
			});
		});
	}
	return new Promise((resolve, reject) => {
		fileSystem.readFile(descriptionFilePath, (err, content) => {
			if (err) {
				resolve(null);
				return;
			}
			if (!content) {
				reject(new Error("No content in file"));
				return;
			}
			try {
				resolve(JSON.parse(content.toString()));
			} catch (/** @type {unknown} */ parseErr) {
				reject(/** @type {Error} */ (parseErr));
			}
		});
	});
}

/**
 * @param {Resolver} resolver resolver
 * @param {string} directory directory
 * @param {string[]} filenames filenames
 * @param {DescriptionFileInfo | undefined} oldInfo oldInfo
 * @param {ResolveContext} resolveContext resolveContext
 * @returns {Promise<DescriptionFileInfo | null | undefined>} description file info
 */
async function loadDescriptionFile(
	resolver,
	directory,
	filenames,
	oldInfo,
	resolveContext,
) {
	let current = directory;
	while (current) {
		if (oldInfo && oldInfo.directory === current) {
			// We already have info for this directory and can reuse it
			return oldInfo;
		}
		const dir = current;
		const found = await forEachBailPromise(filenames, async (filename) => {
			const descriptionFilePath = resolver.join(dir, filename);

			let content;
			try {
				content = await readDescriptionFile(resolver, descriptionFilePath);
			} catch (/** @type {unknown} */ err) {
				const fsErr = /** @type {Error} */ (err);
				if (resolveContext.fileDependencies) {
					resolveContext.fileDependencies.add(descriptionFilePath);
				}
				if (resolveContext.log) {
					resolveContext.log(
						`${descriptionFilePath} (directory description file): ${fsErr}`,
					);
				} else {
					fsErr.message = `${descriptionFilePath} (directory description file): ${fsErr}`;
				}
				throw fsErr;
			}
			if (!content) {
				if (resolveContext.missingDependencies) {
					resolveContext.missingDependencies.add(descriptionFilePath);
				}
				return;
			}
			if (resolveContext.fileDependencies) {
				resolveContext.fileDependencies.add(descriptionFilePath);
			}
			return /** @type {Result} */ ({
				content,
				directory: dir,
				path: descriptionFilePath,
			});
		});

		if (found) return found;

		const parent = cdUp(current);
		if (!parent) return;
		current = parent;
	}
}

/**
 * @param {JsonObject} content content
 * @param {string | string[]} field field
 * @returns {JsonValue | undefined} field data
 */
function getField(content, field) {
	if (!content) return undefined;
	if (Array.isArray(field)) {
		/** @type {JsonValue} */
		let current = content;
		for (let j = 0; j < field.length; j++) {
			if (current === null || typeof current !== "object") {
				current = null;
				break;
			}
			current = /** @type {JsonValue} */ (
				/** @type {JsonObject} */
				(current)[field[j]]
			);
		}
		return current;
	}
	return content[field];
}

module.exports.cdUp = cdUp;
module.exports.getField = getField;
module.exports.loadDescriptionFile = loadDescriptionFile;
