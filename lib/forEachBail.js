/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */

/**
 * @template T
 * @callback Iterator
 * @param {T} item item
 * @param {(err?: null|Error, result?: null|ResolveRequest) => void} callback callback
 * @param {number} i index
 * @returns {void}
 */

/**
 * @template T
 * @param {T[]} array array
 * @param {Iterator<T>} iterator iterator
 * @param {(err?: null|Error, result?: null|ResolveRequest) => void} callback callback after all items are iterated
 * @returns {void}
 */
module.exports = function forEachBail(array, iterator, callback) {
	if (array.length === 0) return callback();

	let i = 0;
	const next = () => {
		/** @type {boolean|undefined} */
		let loop = undefined;
		iterator(
			array[i++],
			(err, result) => {
				if (err || result !== undefined || i >= array.length) {
					return callback(err, result);
				}
				if (loop === false) while (next());
				loop = true;
			},
			i
		);
		if (!loop) loop = false;
		return loop;
	};
	while (next());
};
