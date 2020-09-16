/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const EMPTY = "";

/**
 * @param {string} identifier identifier
 * @returns {[string, string, string]|null} parsed identifier
 */
function parseIdentifier(identifier) {
	const match = /^(#?[^?#]*)(\?[^#]*)?(#.*)?$/.exec(identifier);

	if (!match) return null;

	return [match[1] || EMPTY, match[2] || EMPTY, match[3] || EMPTY];
}

module.exports.parseIdentifier = parseIdentifier;
