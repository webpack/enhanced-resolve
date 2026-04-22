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
	// Common inputs (relative, absolute-posix, module names, `#imports`)
	// never start with `\`, so gate the DOS-prefix check on a single
	// char-code compare and fall straight through to the old two-line
	// scan for everything else.
	let queryStart;
	let fragmentStart;
	if (identifier.charCodeAt(0) === 92) {
		// `\`-prefixed input: may be a DOS device path (`\\?\…` or
		// `\\.\…`). The literal `?` / `.` inside the prefix must not be
		// mistaken for a query separator, so skip past a recognized prefix
		// before scanning.
		let dosPrefixEnd = 0;
		if (
			identifier.length >= 4 &&
			identifier.charCodeAt(1) === 92 &&
			identifier.charCodeAt(3) === 92
		) {
			const c2 = identifier.charCodeAt(2);
			if (c2 === 63 || c2 === 46) dosPrefixEnd = 4;
		}
		queryStart = identifier.indexOf("?", dosPrefixEnd);
		fragmentStart = identifier.indexOf(
			"#",
			dosPrefixEnd > 0 ? dosPrefixEnd : 1,
		);
	} else {
		queryStart = identifier.indexOf("?");
		// Start at index 1 to ignore a possible leading hash.
		fragmentStart = identifier.indexOf("#", 1);
	}

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
