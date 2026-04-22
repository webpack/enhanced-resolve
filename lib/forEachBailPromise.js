/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * Iterate `array` in order, calling the async `iterator` for each item.
 * Resolves with the first truthy result (including `null`), or with
 * `undefined` when no item produced a result. Rejects if any iteration
 * rejects.
 * @template T
 * @template Z
 * @param {T[]} array array
 * @param {(item: T, i: number) => Promise<null | Z | undefined | void>} iterator iterator
 * @returns {Promise<null | Z | undefined>} first result that is not `undefined`
 */
module.exports = async function forEachBailPromise(array, iterator) {
	for (let i = 0; i < array.length; i++) {
		const result = await iterator(array[i], i);
		if (result !== undefined) return result;
	}
	return undefined;
};
