/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {string|string[]} Mapping */
/** @typedef {{[k: string]: Mapping}} ConditionalMapping */
/** @typedef {{[k: string]: ConditionalMapping|Mapping}} ExportField */

/**
 * Processing exports field regarding to proposal
 * https://github.com/jkrems/proposal-pkg-exports
 * @param {ExportField} exportsFieldDefinition exports field
 * @param {string} relativeToPackagePath package relative path
 * @param {Set<string>} conditionNames condition names
 * @returns {string[]} resolved paths
 */
module.exports = function processExportsField(
	exportsFieldDefinition,
	relativeToPackagePath,
	conditionNames
) {
	throw new Error("not implemented");
};
