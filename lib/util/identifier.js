/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const memorize = require("./memoize");

const getUrl = memorize(() => require("url"));

const PATH_QUERY_FRAGMENT_REGEXP =
	/^(#?(?:\0.|[^?#\0])*)(\?(?:\0.|[^#\0])*)?(#.*)?$/;
const ZERO_ESCAPE_REGEXP = /\0(.)/g;
const FILE_REG_EXP = /file:/i;

/**
 * @param {string} identifier identifier
 * @returns {[string, string, string] | null} parsed identifier
 */
function parseIdentifier(identifier) {
	if (!identifier) {
		return null;
	}

	if (FILE_REG_EXP.test(identifier)) {
		identifier = getUrl().fileURLToPath(identifier);
	}

	const firstEscape = identifier.indexOf("\0");

	// Handle `\0`
	if (firstEscape !== -1) {
		const match = PATH_QUERY_FRAGMENT_REGEXP.exec(identifier);

		if (!match) return null;

		return [
			match[1].replace(ZERO_ESCAPE_REGEXP, "$1"),
			match[2] ? match[2].replace(ZERO_ESCAPE_REGEXP, "$1") : "",
			match[3] || "",
		];
	}

	// Fast path for inputs that don't use \0 escaping.
	// Skip past a DOS device path prefix (`\\?\…` or `\\.\…`) so the literal
	// `?` inside the prefix is not mistaken for a query separator.
	const dosPrefixEnd =
		identifier.length >= 4 &&
		identifier.charCodeAt(0) === 92 &&
		identifier.charCodeAt(1) === 92 &&
		identifier.charCodeAt(3) === 92 &&
		(identifier.charCodeAt(2) === 63 || identifier.charCodeAt(2) === 46)
			? 4
			: 0;
	const queryStart = identifier.indexOf("?", dosPrefixEnd);
	// Start at index 1 (or past a DOS prefix) to ignore a possible leading hash.
	const fragmentStart = identifier.indexOf(
		"#",
		dosPrefixEnd > 0 ? dosPrefixEnd : 1,
	);

	if (fragmentStart < 0) {
		if (queryStart < 0) {
			// No fragment, no query
			return [identifier, "", ""];
		}

		// Query, no fragment
		return [identifier.slice(0, queryStart), identifier.slice(queryStart), ""];
	}

	if (queryStart < 0 || fragmentStart < queryStart) {
		// Fragment, no query
		return [
			identifier.slice(0, fragmentStart),
			"",
			identifier.slice(fragmentStart),
		];
	}

	// Query and fragment
	return [
		identifier.slice(0, queryStart),
		identifier.slice(queryStart, fragmentStart),
		identifier.slice(fragmentStart),
	];
}

module.exports.parseIdentifier = parseIdentifier;
