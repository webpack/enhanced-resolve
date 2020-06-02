/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {string|(string|ConditionalMapping)[]} DirectMapping */
/** @typedef {{[k: string]: MappingValue}} ConditionalMapping */
/** @typedef {ConditionalMapping|DirectMapping|null} MappingValue */
/** @typedef {Record<string, MappingValue>|ConditionalMapping|DirectMapping} ExportsField */

/**
 * @typedef {Object} PathTreeNode
 * @property {Map<string, PathTreeNode>|null} children
 * @property {MappingValue} folder
 * @property {Map<string, MappingValue>} files
 */

/**
 * Processing exports field
 * @callback ExportsFieldProcessor
 * @param {string} relativeToPackagePathRequest package relative path
 * @param {Set<string>} conditionNames condition names
 * @returns {string[]} resolved paths
 */

/*
Example export field:
{
  ".": "./main.js",
  "./feature": {
    "browser": "./feature-browser.js",
    "default": "./feature.js"
  }
}
Terminology:

Enhanced-resolve name keys ("." and "./feature") as export field keys.

If value is string or string[], mapping is called as a direct mapping
and value called as a direct export.

If value is key-value object, mapping is called as a conditional mapping
and value called as a conditional export.

Key in conditional mapping is called condition name.

Conditional mapping nested in another conditional mapping is called nested mapping.

*/

const slashCode = "/".charCodeAt(0);
const dotCode = ".".charCodeAt(0);

/**
 * @param {ExportsField} exportsField the exports field
 * @returns {ExportsFieldProcessor} process callback
 */
module.exports = function processExportsField(exportsField) {
	const treeRoot = buildPathTree(exportsField);

	return function exportsFieldProcessor(
		relativeToPackagePathRequest,
		conditionNames
	) {
		assertRequest(relativeToPackagePathRequest);

		const match = findMatch(relativeToPackagePathRequest, treeRoot);

		if (match === null) return [];

		/** @type {DirectMapping|null} */
		let direct = null;
		const [export_, remainRequestIndex] = match;

		if (isConditionalMapping(export_)) {
			direct = conditionalMapping(
				/** @type {ConditionalMapping} */ (export_),
				conditionNames
			);

			// matching not found
			if (direct === null) return [];
		} else {
			direct = /** @type {DirectMapping} */ (export_);
		}

		const remainingRequest =
			remainRequestIndex !== relativeToPackagePathRequest.length
				? relativeToPackagePathRequest.slice(remainRequestIndex)
				: undefined;

		return directMapping(remainingRequest, direct, conditionNames);
	};
};

/**
 * @param {string} request request
 */
function assertRequest(request) {
	if (request.charCodeAt(0) !== dotCode) {
		throw new Error('Request should be relative path and start with "."');
	}
	if (request.length === 1) return;
	if (request.charCodeAt(1) !== slashCode) {
		throw new Error('Request should be relative path and start with "./"');
	}
	if (request.charCodeAt(request.length - 1) === slashCode) {
		throw new Error("Only requesting file allowed");
	}
}

/**
 * Trying to match request to export field
 * @param {string} request request
 * @param {PathTreeNode} treeRoot path tree root
 * @returns {[MappingValue, number]|null} match or null
 */
function findMatch(request, treeRoot) {
	if (request.length === 1) {
		const value = treeRoot.files.get("*root*");

		return value ? [value, 1] : null;
	}

	if (treeRoot.children === null && treeRoot.folder === null) {
		const value = treeRoot.files.get(request.slice(2));

		return value ? [value, request.length] : null;
	}

	let node = treeRoot;
	let lastNonSlashIndex = 2;
	let slashIndex = request.indexOf("/", 2);

	/** @type {[MappingValue, number]|null} */
	let lastFolderMatch = null;

	while (slashIndex !== -1) {
		const folder = request.slice(lastNonSlashIndex, slashIndex);

		const folderMapping = node.folder;
		if (folderMapping) {
			lastFolderMatch = [folderMapping, lastNonSlashIndex];
		}

		if (node.children === null) return lastFolderMatch;

		const newNode = node.children.get(folder);

		if (!newNode) {
			const value = node.folder;

			return value ? [value, lastNonSlashIndex] : null;
		}

		node = newNode;
		lastNonSlashIndex = slashIndex + 1;
		slashIndex = request.indexOf("/", lastNonSlashIndex);
	}

	const value = node.files.get(request.slice(lastNonSlashIndex));

	if (value) {
		return [value, request.length];
	}

	const folderMapping = node.folder;
	if (folderMapping) {
		return [folderMapping, lastNonSlashIndex];
	}

	return lastFolderMatch;
}

/**
 * @param {string} exp export target
 * @param {boolean} expectFolder is folder expected
 */
function assertExport(exp, expectFolder) {
	if (
		exp.charCodeAt(0) === slashCode ||
		(exp.charCodeAt(0) === dotCode && exp.charCodeAt(1) !== slashCode)
	) {
		throw new Error(
			`Export should be relative path and start with "./", got ${JSON.stringify(
				exp
			)}.`
		);
	}

	const isFolder = exp.charCodeAt(exp.length - 1) === slashCode;

	if (isFolder !== expectFolder) {
		throw new Error(
			expectFolder
				? `Expecting folder to folder mapping. ${JSON.stringify(
						exp
				  )} should end with "/"`
				: `Expecting file to file mapping. ${JSON.stringify(
						exp
				  )} should not end with "/"`
		);
	}
}

/**
 * @param {ConditionalMapping|DirectMapping|null} mapping mapping
 * @returns {boolean} is conditional mapping
 */
function isConditionalMapping(mapping) {
	return (
		mapping !== null && typeof mapping === "object" && !Array.isArray(mapping)
	);
}

/**
 * @param {string|undefined} remainingRequest remaining request when folder mapping, undefined for file mappings
 * @param {DirectMapping|null} directExport direct export
 * @param {Set<string>} conditionNames condition names
 * @returns {string[]} mapping result
 */
function directMapping(remainingRequest, directExport, conditionNames) {
	if (directExport === null) return [];

	const expectFolder = remainingRequest !== undefined;

	if (typeof directExport === "string") {
		assertExport(directExport, expectFolder);

		return expectFolder
			? [`${directExport}${remainingRequest}`]
			: [directExport];
	}

	const _exports = [];

	for (const exp of directExport) {
		if (typeof exp === "string") {
			assertExport(exp, expectFolder);
			_exports.push(expectFolder ? `${exp}${remainingRequest}` : exp);
			continue;
		}

		const mapping = conditionalMapping(exp, conditionNames);
		if (!mapping) continue;
		const innerExports = directMapping(
			remainingRequest,
			mapping,
			conditionNames
		);
		for (const innerExport of innerExports) {
			_exports.push(innerExport);
		}
	}

	return _exports;
}

/**
 * @param {ConditionalMapping} conditionalExport direct export
 * @param {Set<string>} conditionNames condition names
 * @returns {DirectMapping|null} direct mapping if found
 */
function conditionalMapping(conditionalExport, conditionNames) {
	/** @type {[ConditionalMapping, string[], number][]} */
	let lookup = [[conditionalExport, Object.keys(conditionalExport), 0]];

	loop: while (lookup.length > 0) {
		const [exportValue, conditions, j] = lookup[lookup.length - 1];
		const last = conditions.length - 1;

		for (let i = j; i < conditions.length; i++) {
			const condition = conditions[i];

			// assert default. Could be last only
			if (i !== last) {
				if (condition === "default") {
					throw new Error("Default condition should be last one");
				}
			} else if (condition === "default") {
				const mapping = exportValue[condition];
				// is nested
				if (isConditionalMapping(mapping)) {
					const conditionalMapping = /** @type {ConditionalMapping} */ (mapping);
					lookup[lookup.length - 1][2] = i + 1;
					lookup.push([conditionalMapping, Object.keys(conditionalMapping), 0]);
					continue loop;
				}

				return /** @type {DirectMapping} */ (mapping);
			}

			if (conditionNames.has(condition)) {
				const mapping = exportValue[condition];
				// is nested
				if (isConditionalMapping(mapping)) {
					const conditionalMapping = /** @type {ConditionalMapping} */ (mapping);
					lookup[lookup.length - 1][2] = i + 1;
					lookup.push([conditionalMapping, Object.keys(conditionalMapping), 0]);
					continue loop;
				}

				return /** @type {DirectMapping} */ (mapping);
			}
		}

		lookup.pop();
	}

	return null;
}

/**
 * @param {ExportsField} exportField export field
 * @returns {PathTreeNode} tree root
 */
function buildPathTree(exportField) {
	/** @type {PathTreeNode} */
	const root = {
		children: null,
		folder: null,
		files: new Map()
	};

	// handle syntax sugar, if export field is direct mapping for "."
	if (typeof exportField === "string") {
		root.files.set("*root*", exportField);

		return root;
	} else if (Array.isArray(exportField)) {
		root.files.set("*root*", exportField.slice());

		return root;
	}

	const keys = Object.keys(exportField);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];

		if (key.charCodeAt(0) !== dotCode) {
			// handle syntax sugar, if export field is conditional mapping for "."
			if (i === 0) {
				while (i < keys.length) {
					const charCode = keys[i].charCodeAt(0);
					if (charCode === dotCode || charCode === slashCode) {
						throw new Error(
							`Export field key should be relative path and start with "." (key: ${JSON.stringify(
								key
							)})`
						);
					}
					i++;
				}

				root.files.set("*root*", exportField);
				return root;
			}

			throw new Error(
				`Export field key should be relative path and start with "." (key: ${JSON.stringify(
					key
				)})`
			);
		}

		if (key.length === 1) {
			root.files.set("*root*", exportField[key]);
			continue;
		}

		if (key.charCodeAt(1) !== slashCode) {
			throw new Error(
				`Export field key should be relative path and start with "./" (key: ${JSON.stringify(
					key
				)})`
			);
		}

		let node = root;
		let lastNonSlashIndex = 2;
		let slashIndex = key.indexOf("/", 2);

		while (slashIndex !== -1) {
			const folder = key.slice(lastNonSlashIndex, slashIndex);
			let newNode;

			if (node.children === null) {
				newNode = {
					children: null,
					folder: null,
					files: new Map()
				};
				node.children = new Map();
				node.children.set(folder, newNode);
			} else {
				newNode = node.children.get(folder);

				if (!newNode) {
					newNode = {
						children: null,
						folder: null,
						files: new Map()
					};
					node.children.set(folder, newNode);
				}
			}

			node = newNode;
			lastNonSlashIndex = slashIndex + 1;
			slashIndex = key.indexOf("/", lastNonSlashIndex);
		}

		if (lastNonSlashIndex < key.length) {
			node.files.set(key.slice(lastNonSlashIndex), exportField[key]);
		} else {
			node.folder = exportField[key];
		}
	}

	return root;
}
