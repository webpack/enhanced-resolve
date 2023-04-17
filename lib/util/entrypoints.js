/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {string|(string|ConditionalMapping)[]} DirectMapping */
/** @typedef {{[k: string]: MappingValue}} ConditionalMapping */
/** @typedef {ConditionalMapping|DirectMapping|null} MappingValue */
/** @typedef {Record<string, MappingValue>|ConditionalMapping|DirectMapping} ExportsField */
/** @typedef {Record<string, MappingValue>} ImportsField */

/**
 * @typedef {Object} PathTreeNode
 * @property {Map<string, PathTreeNode>|null} children
 * @property {MappingValue} folder
 * @property {Map<string, MappingValue>|null} wildcards
 * @property {Map<string, MappingValue>} files
 */

/**
 * Processing exports/imports field
 * @callback FieldProcessor
 * @param {string} request request
 * @param {Set<string>} conditionNames condition names
 * @returns {string[]} resolved paths
 */

/*
Example exports field:
{
  ".": "./main.js",
  "./feature": {
    "browser": "./feature-browser.js",
    "default": "./feature.js"
  }
}
Terminology:

Enhanced-resolve name keys ("." and "./feature") as exports field keys.

If value is string or string[], mapping is called as a direct mapping
and value called as a direct export.

If value is key-value object, mapping is called as a conditional mapping
and value called as a conditional export.

Key in conditional mapping is called condition name.

Conditional mapping nested in another conditional mapping is called nested mapping.

----------

Example imports field:
{
  "#a": "./main.js",
  "#moment": {
    "browser": "./moment/index.js",
    "default": "moment"
  },
  "#moment/": {
    "browser": "./moment/",
    "default": "moment/"
  }
}
Terminology:

Enhanced-resolve name keys ("#a" and "#moment/", "#moment") as imports field keys.

If value is string or string[], mapping is called as a direct mapping
and value called as a direct export.

If value is key-value object, mapping is called as a conditional mapping
and value called as a conditional export.

Key in conditional mapping is called condition name.

Conditional mapping nested in another conditional mapping is called nested mapping.

*/

const { fileURLToPath } = require("url");
const slashCode = "/".charCodeAt(0);
const dotCode = ".".charCodeAt(0);
const hashCode = "#".charCodeAt(0);

/**
 * @param {ExportsField} exportsField the exports field
 * @returns {FieldProcessor} process callback
 */
module.exports.processExportsField = function processExportsField(
	exportsField
) {
	return createFieldProcessor(
		buildExportsFieldPathTree(exportsField),
		exportsField,
		assertExportsFieldRequest,
		assertExportTarget
	);
};

/**
 * @param {ImportsField} importsField the exports field
 * @returns {FieldProcessor} process callback
 */
module.exports.processImportsField = function processImportsField(
	importsField
) {
	return createFieldProcessor(
		buildImportsFieldPathTree(importsField),
		importsField,
		assertImportsFieldRequest,
		assertImportTarget
	);
};

/**
 * @param {PathTreeNode} treeRoot root
 * @param {ExportsField | ImportsField} field exports or import field
 * @param {(s: string) => string} assertRequest assertRequest
 * @param {(s: string, f: boolean) => void} assertTarget assertTarget
 * @returns {FieldProcessor} field processor
 */
function createFieldProcessor(treeRoot, field, assertRequest, assertTarget) {
	return function fieldProcessor(request, conditionNames) {
		request = assertRequest(request);

		const match = findMatch(request, field);

		if (match === null) return [];

		const [mapping, remainingRequest, subpathMapping] = match;

		/** @type {DirectMapping|null} */
		let direct = null;

		if (isConditionalMapping(mapping)) {
			direct = conditionalMapping(
				/** @type {ConditionalMapping} */ (mapping),
				conditionNames
			);

			// matching not found
			if (direct === null) return [];
		} else {
			direct = /** @type {DirectMapping} */ (mapping);
		}

		return directMapping(
			remainingRequest,
			subpathMapping,
			direct,
			conditionNames,
			assertTarget
		);
	};
}

/**
 * @param {string} request request
 * @returns {string} updated request
 */
function assertExportsFieldRequest(request) {
	if (request.charCodeAt(0) !== dotCode) {
		throw new Error('Request should be relative path and start with "."');
	}
	if (request.length === 1) return "";
	if (request.charCodeAt(1) !== slashCode) {
		throw new Error('Request should be relative path and start with "./"');
	}
	if (request.charCodeAt(request.length - 1) === slashCode) {
		throw new Error("Only requesting file allowed");
	}

	return request.slice(2);
}

/**
 * @param {string} request request
 * @returns {string} updated request
 */
function assertImportsFieldRequest(request) {
	if (request.charCodeAt(0) !== hashCode) {
		throw new Error('Request should start with "#"');
	}
	if (request.length === 1) {
		throw new Error("Request should have at least 2 characters");
	}
	if (request.charCodeAt(1) === slashCode) {
		throw new Error('Request should not start with "#/"');
	}
	if (request.charCodeAt(request.length - 1) === slashCode) {
		throw new Error("Only requesting file allowed");
	}

	return request.slice(1);
}

/**
 * @param {string} exp export target
 * @param {boolean} expectFolder is folder expected
 */
function assertExportTarget(exp, expectFolder) {
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
 * @param {string} imp import target
 * @param {boolean} expectFolder is folder expected
 */
function assertImportTarget(imp, expectFolder) {
	const isFolder = imp.charCodeAt(imp.length - 1) === slashCode;

	if (isFolder !== expectFolder) {
		throw new Error(
			expectFolder
				? `Expecting folder to folder mapping. ${JSON.stringify(
						imp
				  )} should end with "/"`
				: `Expecting file to file mapping. ${JSON.stringify(
						imp
				  )} should not end with "/"`
		);
	}
}

function patternKeyCompare(a, b) {
	const aPatternIndex = a.indexOf("*");
	const bPatternIndex = b.indexOf("*");
	const baseLenA = aPatternIndex === -1 ? a.length : aPatternIndex + 1;
	const baseLenB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;

	if (baseLenA > baseLenB) return -1;
	if (baseLenB > baseLenA) return 1;
	if (aPatternIndex === -1) return 1;
	if (bPatternIndex === -1) return -1;
	if (a.length > b.length) return -1;
	if (b.length > a.length) return 1;

	return 0;
}

function isConditionalExportsMainSugar(exports) {
	if (typeof exports === "string" || Array.isArray(exports)) return true;
	if (typeof exports !== "object" || exports === null) return false;

	const keys = Object.getOwnPropertyNames(exports);
	let isConditionalSugar = false;
	let i = 0;
	for (let j = 0; j < keys.length; j++) {
		const key = keys[j];
		const curIsConditionalSugar = key === "" || key[0] !== ".";
		if (i++ === 0) {
			isConditionalSugar = curIsConditionalSugar;
		} else if (isConditionalSugar !== curIsConditionalSugar) {
			// TODO
		}
	}
	return isConditionalSugar;
}

/**
 * Trying to match request to field
 * @param {string} request request
 * @param {ExportsField | ImportsField} field exports or import field
 * @returns {[MappingValue, string, boolean]|null} match or null, number is negative and one less when it's a folder mapping, number is request.length + 1 for direct mappings
 */
function findMatch(request, field) {
	if (isConditionalExportsMainSugar(field)) {
		field = { ".": field };
	}

	if (
		(Object.prototype.hasOwnProperty.call(field, "./" + request) ||
			Object.prototype.hasOwnProperty.call(field, "." + request)) &&
		!request.includes("*") &&
		!request.endsWith("/")
	) {
		const target = field["./" + request] || field["." + request];

		if (target === "./") return null;

		const isDirectory =
			typeof target === "string" ? target.endsWith("/") : false;

		return [target, "", isDirectory];
	}

	let bestMatch = "";
	let bestMatchSubpath;

	const keys = Object.getOwnPropertyNames(field);

	for (let i = 0; i < keys.length; i++) {
		const originalKey = keys[i];
		const key = keys[i].slice(2);
		const patternIndex = key.indexOf("*");

		if (patternIndex !== -1 && request.startsWith(key.slice(0, patternIndex))) {
			const patternTrailer = key.slice(patternIndex + 1);

			if (
				request.length >= key.length &&
				request.endsWith(patternTrailer) &&
				patternKeyCompare(bestMatch, key) === 1 &&
				key.lastIndexOf("*") === patternIndex
			) {
				bestMatch = key;
				bestMatchSubpath = request.slice(
					patternIndex,
					request.length - patternTrailer.length
				);
			}
		} else if (
			originalKey[originalKey.length - 1] === "/" &&
			request.startsWith(key) &&
			patternKeyCompare(bestMatch, key) === 1
		) {
			bestMatch = originalKey;
			bestMatchSubpath = request.slice(key.length);
		}
	}

	if (bestMatch === "") return null;

	const target =
		field[bestMatch.startsWith("./") ? bestMatch : "./" + bestMatch];
	const pattern = bestMatch.endsWith("/");

	return [target, /** @type {string} */ (bestMatchSubpath), pattern];
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
 * @param {boolean} subpathMapping true, for subpath mappings
 * @param {DirectMapping|null} mappingTarget direct export
 * @param {Set<string>} conditionNames condition names
 * @param {(d: string, f: boolean) => void} assert asserting direct value
 * @returns {string[]} mapping result
 */
function directMapping(
	remainingRequest,
	subpathMapping,
	mappingTarget,
	conditionNames,
	assert
) {
	if (mappingTarget === null) return [];

	if (typeof mappingTarget === "string") {
		return [
			targetMapping(remainingRequest, subpathMapping, mappingTarget, assert)
		];
	}

	const targets = [];

	for (const exp of mappingTarget) {
		if (typeof exp === "string") {
			targets.push(
				targetMapping(remainingRequest, subpathMapping, exp, assert)
			);
			continue;
		}

		const mapping = conditionalMapping(exp, conditionNames);
		if (!mapping) continue;
		const innerExports = directMapping(
			remainingRequest,
			subpathMapping,
			mapping,
			conditionNames,
			assert
		);
		for (const innerExport of innerExports) {
			targets.push(innerExport);
		}
	}

	return targets;
}

/**
 * @param {string|undefined} remainingRequest remaining request when folder mapping, undefined for file mappings
 * @param {boolean} subpathMapping true, for subpath mappings
 * @param {string} mappingTarget direct export
 * @param {(d: string, f: boolean) => void} assert asserting direct value
 * @returns {string} mapping result
 */
function targetMapping(
	remainingRequest,
	subpathMapping,
	mappingTarget,
	assert
) {
	if (remainingRequest === undefined) {
		assert(mappingTarget, false);
		return mappingTarget;
	}
	if (subpathMapping) {
		assert(mappingTarget, true);
		return mappingTarget + remainingRequest;
	}
	assert(mappingTarget, false);

	return mappingTarget.replace(/\*/g, remainingRequest.replace(/\$/g, "$$"));
}

/**
 * @param {ConditionalMapping} conditionalMapping_ conditional mapping
 * @param {Set<string>} conditionNames condition names
 * @returns {DirectMapping|null} direct mapping if found
 */
function conditionalMapping(conditionalMapping_, conditionNames) {
	/** @type {[ConditionalMapping, string[], number][]} */
	let lookup = [[conditionalMapping_, Object.keys(conditionalMapping_), 0]];

	loop: while (lookup.length > 0) {
		const [mapping, conditions, j] = lookup[lookup.length - 1];
		const last = conditions.length - 1;

		for (let i = j; i < conditions.length; i++) {
			const condition = conditions[i];

			// assert default. Could be last only
			if (i !== last) {
				if (condition === "default") {
					throw new Error("Default condition should be last one");
				}
			} else if (condition === "default") {
				const innerMapping = mapping[condition];
				// is nested
				if (isConditionalMapping(innerMapping)) {
					const conditionalMapping = /** @type {ConditionalMapping} */ (innerMapping);
					lookup[lookup.length - 1][2] = i + 1;
					lookup.push([conditionalMapping, Object.keys(conditionalMapping), 0]);
					continue loop;
				}

				return /** @type {DirectMapping} */ (innerMapping);
			}

			if (conditionNames.has(condition)) {
				const innerMapping = mapping[condition];
				// is nested
				if (isConditionalMapping(innerMapping)) {
					const conditionalMapping = /** @type {ConditionalMapping} */ (innerMapping);
					lookup[lookup.length - 1][2] = i + 1;
					lookup.push([conditionalMapping, Object.keys(conditionalMapping), 0]);
					continue loop;
				}

				return /** @type {DirectMapping} */ (innerMapping);
			}
		}

		lookup.pop();
	}

	return null;
}

/**
 * Internal helper to create path tree node
 * to ensure that each node gets the same hidden class
 * @returns {PathTreeNode} node
 */
function createNode() {
	return {
		children: null,
		folder: null,
		wildcards: null,
		files: new Map()
	};
}

/**
 * Internal helper for building path tree
 * @param {PathTreeNode} root root
 * @param {string} path path
 * @param {MappingValue} target target
 */
function walkPath(root, path, target) {
	if (path.length === 0) {
		root.folder = target;
		return;
	}

	let node = root;
	// Typical path tree can look like
	// root
	// - files: ["a.js", "b.js"]
	// - children:
	//    node1:
	//    - files: ["a.js", "b.js"]
	let lastNonSlashIndex = 0;
	let slashIndex = path.indexOf("/", 0);

	while (slashIndex !== -1) {
		const folder = path.slice(lastNonSlashIndex, slashIndex);
		let newNode;

		// If the folder is a wildcard, create a new wildcard node or get an existing one.
		if (folder === "*") {
			if (node.wildcards === null) {
				newNode = createNode();
				node.wildcards = new Map();
				node.wildcards.set("", newNode);
			} else {
				newNode = node.wildcards.get(folder) || createNode();
				node.wildcards.set("", newNode);
			}
		} else {
			// If the folder is not a wildcard, create a new child node or get an existing one.
			if (node.children === null) {
				newNode = createNode();
				node.children = new Map();
				node.children.set(folder, newNode);
			} else {
				newNode = node.children.get(folder) || createNode();
				node.children.set(folder, newNode);
			}
		}

		node = /** @type {PathTreeNode} */ (newNode);
		lastNonSlashIndex = slashIndex + 1;
		slashIndex = path.indexOf("/", lastNonSlashIndex);
	}

	if (lastNonSlashIndex >= path.length) {
		node.folder = target;
	} else {
		const file = lastNonSlashIndex > 0 ? path.slice(lastNonSlashIndex) : path;
		const wildcardsIndex = file.indexOf("*");
		if (wildcardsIndex !== -1) {
			if (node.wildcards === null) node.wildcards = new Map();
			node.wildcards.set(file.slice(0, wildcardsIndex), target);
		} else {
			node.files.set(file, target);
		}
	}
}

/**
 * @param {ExportsField} field exports field
 * @returns {PathTreeNode} tree root
 */
function buildExportsFieldPathTree(field) {
	const root = createNode();

	// handle syntax sugar, if exports field is direct mapping for "."
	if (typeof field === "string") {
		root.files.set("", field);

		return root;
	} else if (Array.isArray(field)) {
		root.files.set("", field.slice());

		return root;
	}

	const keys = Object.keys(field);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];

		if (key.charCodeAt(0) !== dotCode) {
			// handle syntax sugar, if exports field is conditional mapping for "."
			if (i === 0) {
				while (i < keys.length) {
					const charCode = keys[i].charCodeAt(0);
					if (charCode === dotCode || charCode === slashCode) {
						throw new Error(
							`Exports field key should be relative path and start with "." (key: ${JSON.stringify(
								key
							)})`
						);
					}
					i++;
				}

				root.files.set("", field);
				return root;
			}

			throw new Error(
				`Exports field key should be relative path and start with "." (key: ${JSON.stringify(
					key
				)})`
			);
		}

		if (key.length === 1) {
			root.files.set("", field[key]);
			continue;
		}

		if (key.charCodeAt(1) !== slashCode) {
			throw new Error(
				`Exports field key should be relative path and start with "./" (key: ${JSON.stringify(
					key
				)})`
			);
		}

		walkPath(root, key.slice(2), field[key]);
	}

	return root;
}

/**
 * @param {ImportsField} field imports field
 * @returns {PathTreeNode} root
 */
function buildImportsFieldPathTree(field) {
	const root = createNode();

	const keys = Object.keys(field);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];

		if (key.charCodeAt(0) !== hashCode) {
			throw new Error(
				`Imports field key should start with "#" (key: ${JSON.stringify(key)})`
			);
		}

		if (key.length === 1) {
			throw new Error(
				`Imports field key should have at least 2 characters (key: ${JSON.stringify(
					key
				)})`
			);
		}

		if (key.charCodeAt(1) === slashCode) {
			throw new Error(
				`Imports field key should not start with "#/" (key: ${JSON.stringify(
					key
				)})`
			);
		}

		walkPath(root, key.slice(1), field[key]);
	}

	return root;
}
