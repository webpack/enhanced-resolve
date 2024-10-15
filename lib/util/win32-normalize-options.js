/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { transformPathToPosix } = require("./path");

/** @typedef {import("../AliasPlugin").AliasOption} AliasOptionEntry */
/** @typedef {import("../Resolver").ResolveOptions} ResolveOptions */

/**
 * @param {AliasOptionEntry[]} aliasOptions alias options
 * @returns {AliasOptionEntry[]} normalized for win32 aliases
 */
function normalizeWindowsAliasOption(aliasOptions) {
	return aliasOptions.map(aliasOption => {
		let newAliasOption = aliasOption.alias;

		if (typeof newAliasOption !== "boolean") {
			newAliasOption = normalizeStringOrArrayOfStrings(newAliasOption);
		}

		return {
			...aliasOption,
			name: normalizeStringOrArrayOfStrings(aliasOption.name),
			alias: newAliasOption
		};
	});
}

/**
 * @param {Set<string | string[]> | Set<string> | Set<string[]>} rawSet alias
 * @returns {*} normalized fon win32 sets of string or string[]
 */
function normalizeStringifiedSets(rawSet) {
	const normalizedSet = new Set();
	rawSet.forEach(item => {
		normalizedSet.add(normalizeStringOrArrayOfStrings(item));
	});
	return normalizedSet;
}

/**
 * @param {string | string[]} str str
 * @returns {*} normalized str
 */
function normalizeStringOrArrayOfStrings(str) {
	return Array.isArray(str)
		? str.map(transformPathToPosix)
		: transformPathToPosix(str);
}

/**
 * @param {ResolveOptions} resolveOptions input options
 * @returns {ResolveOptions} output options
 */
function normalizeOptionsForWindows(resolveOptions) {
	// List of all options that can be passed with win32 path separator
	resolveOptions.alias = normalizeWindowsAliasOption(resolveOptions.alias);
	resolveOptions.fallback = normalizeWindowsAliasOption(
		resolveOptions.fallback
	);
	resolveOptions.aliasFields = normalizeStringifiedSets(
		resolveOptions.aliasFields
	);
	resolveOptions.extensionAlias = resolveOptions.extensionAlias.map(
		aliasOption => ({
			...aliasOption,
			alias: normalizeStringOrArrayOfStrings(aliasOption.alias)
		})
	);
	resolveOptions.conditionNames = normalizeStringifiedSets(
		resolveOptions.conditionNames
	);
	resolveOptions.descriptionFiles = normalizeStringOrArrayOfStrings(
		resolveOptions.descriptionFiles
	);
	resolveOptions.exportsFields = normalizeStringifiedSets(
		resolveOptions.exportsFields
	);
	resolveOptions.importsFields = normalizeStringifiedSets(
		resolveOptions.importsFields
	);
	resolveOptions.extensions = normalizeStringifiedSets(
		resolveOptions.extensions
	);
	resolveOptions.modules = Array.isArray(resolveOptions.modules)
		? resolveOptions.modules.map(item => normalizeStringOrArrayOfStrings(item))
		: resolveOptions.modules;
	resolveOptions.mainFiles = normalizeStringifiedSets(resolveOptions.mainFiles);
	resolveOptions.roots = normalizeStringifiedSets(resolveOptions.roots);

	const newRestrictions = new Set();
	resolveOptions.restrictions.forEach(restrict => {
		if (typeof restrict === "string") {
			newRestrictions.add(normalizeStringOrArrayOfStrings(restrict));
		} else {
			// regexp
			newRestrictions.add(restrict);
		}
	});
	resolveOptions.restrictions = newRestrictions;

	return resolveOptions;
}

exports.normalizeOptionsForWindows = normalizeOptionsForWindows;
