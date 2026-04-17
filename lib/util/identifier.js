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
const CHAR_LOWER_F = 0x66; // "f"
const CHAR_UPPER_F = 0x46; // "F"

/**
 * @param {string} identifier identifier
 * @returns {[string, string, string] | null} parsed identifier
 */
function parseIdentifier(identifier) {
	if (!identifier) {
		return null;
	}

	// File URLs always start with "file:" (case-insensitive). On every
	// resolve we were running a full `/file:/i` scan over the identifier;
	// for the overwhelming majority of inputs (relative paths, module
	// specifiers, absolute paths) the first char already disqualifies it,
	// so bail out before building a regex state machine.
	const c0 = identifier.charCodeAt(0);
	if (
		(c0 === CHAR_LOWER_F || c0 === CHAR_UPPER_F) &&
		FILE_REG_EXP.test(identifier)
	) {
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
	const queryStart = identifier.indexOf("?");
	// Start at index 1 to ignore a possible leading hash.
	const fragmentStart = identifier.indexOf("#", 1);

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
