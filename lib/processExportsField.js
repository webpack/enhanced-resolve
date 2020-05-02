/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {string|string[]} DirectMapping */
/** @typedef {{[k: string]: MappingValue}} ConditionalMapping */
/** @typedef {ConditionalMapping|DirectMapping|null} MappingValue */
/** @typedef {Record<string, MappingValue>|string} ExportField */

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

	const exports = Object.keys(exportsFieldDefinition).sort(
		(a, b) => b.length - a.length
	);

	for (let i = 0; i < exports.length; i++) {
		const match = tryToMatch(relativeToPackagePathRequest, exports[i]);

		if (match === -1) continue;

		/** @type {DirectMapping|null} */
		let direct = null;
		const export_ = exportsFieldDefinition[exports[i]];

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
			match !== relativeToPackagePathRequest.length
				? relativeToPackagePathRequest.slice(match)
				: undefined;

		return directMapping(remainingRequest, direct);
	}

	return [];
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
 * @param {string} exportFieldKey export field key
 * @returns {number} if found match return remaining request start index, else -1
 */
function tryToMatch(request, exportFieldKey) {
	if (exportFieldKey.charCodeAt(0) !== dotCode) {
		throw new Error(
			'Export field key should be relative path and start with "."'
		);
	}

	if (request.length === 1) {
		return exportFieldKey.length === 1 ? 1 : -1;
	}

	if (exportFieldKey.charCodeAt(1) !== slashCode) {
		throw new Error(
			'Export field key should be relative path and start with "./"'
		);
	}

	let i = 2;

	while (i < exportFieldKey.length) {
		if (exportFieldKey.charCodeAt(i) !== request.charCodeAt(i++)) return -1;
	}

	// file mapping
	if (request.length === i) {
		return i;
	}

	return request.charCodeAt(i - 1) === slashCode ? i : -1;
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
		throw new Error('Export should be relative path and start with "./"');
	}

	const isFolder = exp.charCodeAt(exp.length - 1) === slashCode;

	if (isFolder !== expectFolder) {
		throw new Error(
			expectFolder
				? "Expecting folder to folder mapping. Folder to file found"
				: "Expecting file to file mapping. File to folder found"
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
	/** @type {ConditionalMapping|null} */
	let nextLookup = conditionalExport;

	loop: while (nextLookup !== null) {
		const conditions = Object.keys(nextLookup);
		const last = conditions.length - 1;

		for (let i = 0; i < conditions.length; i++) {
			const condition = conditions[i];

			// assert default. Could be last only
			if (i !== last) {
				if (condition === "default") {
					throw new Error("Default condition should be last one");
				}
			} else if (condition === "default") {
				const mapping = nextLookup[condition];
				// is nested
				if (isConditionalMapping(mapping)) {
					nextLookup = mapping;
					continue loop;
				}

				return /** @type {DirectMapping} */ (mapping);
			}

			if (conditionNames.has(condition)) {
				const mapping = nextLookup[condition];
				// is nested
				if (isConditionalMapping(mapping)) {
					nextLookup = /** @type {ConditionalMapping} */ (mapping);
					continue loop;
				}

				return /** @type {DirectMapping} */ (mapping);
			}
		}

		nextLookup = null;
	}

	return null;
}
