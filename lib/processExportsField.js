/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {string|string[]} DirectMapping */
/** @typedef {{[k: string]: MappingValue}} ConditionalMapping */
/** @typedef {ConditionalMapping|DirectMapping|null} MappingValue */
/** @typedef {Record<string, MappingValue>|string} ExportField */

/**
 * @typedef {Object} PathTreeNode
 * @property {Map<string, PathTreeNode>|null} children
 * @property {MappingValue} folder
 * @property {Map<string, MappingValue>} files
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
 * Processing exports field regarding to proposal
 * https://github.com/jkrems/proposal-pkg-exports
 * @param {ExportField} exportsFieldDefinition exports field
 * @param {string} relativeToPackagePathRequest package relative path
 * @param {Set<string>} conditionNames condition names
 * @returns {string[]} resolved paths
 */
module.exports = function processExportsField(
	exportsFieldDefinition,
	relativeToPackagePathRequest,
	conditionNames
) {
	assertRequest(relativeToPackagePathRequest);

	if (typeof exportsFieldDefinition === "string") {
		if (relativeToPackagePathRequest.length > 1) return [];

		return [exportsFieldDefinition];
	}

	const treeRoot = buildPathTree(exportsFieldDefinition);
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

	return directMapping(remainingRequest, direct);
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

	let node = treeRoot;
	let lastNonSlashIndex = 2;
	let slashIndex = request.indexOf("/", 2);

	while (slashIndex !== -1) {
		const folder = request.slice(lastNonSlashIndex, slashIndex);

		if (node.children === null) {
			const value = node.folder;

			return value ? [value, lastNonSlashIndex] : null;
		}

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

	if (node.folder) {
		return [node.folder, lastNonSlashIndex];
	}

	return null;
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
 * @returns {string[]} mapping result
 */
function directMapping(remainingRequest, directExport) {
	if (directExport === null) return [];

	const expectFolder = remainingRequest !== undefined;

	if (typeof directExport === "string") {
		assertExport(directExport, expectFolder);

		return expectFolder
			? [`${directExport}${remainingRequest}`]
			: [directExport];
	}

	for (const exp of directExport) {
		assertExport(exp, expectFolder);
	}

	return expectFolder
		? directExport.map(d => `${d}${remainingRequest}`)
		: directExport.slice();
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
 * @param {ExportField} exportField export field
 * @returns {PathTreeNode} tree root
 */
function buildPathTree(exportField) {
	const keys = Object.keys(exportField);

	/** @type {PathTreeNode} */
	const root = {
		children: null,
		folder: null,
		files: new Map()
	};

	for (const key of keys) {
		if (key.charCodeAt(0) !== dotCode) {
			throw new Error(
				'Export field key should be relative path and start with "."'
			);
		}

		if (key.length === 1) {
			root.files.set("*root*", exportField[key]);
			continue;
		}

		if (key.charCodeAt(1) !== slashCode) {
			throw new Error(
				'Export field key should be relative path and start with "./"'
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
