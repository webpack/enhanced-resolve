/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

module.exports = function forEachBail(array, iterator, callback) {
	if (array.length === 0) return callback();

	let index = 0;
	let inCall = true;
	/**
	 * @type {Array<any> | true | undefined}
	 */
	let inCallResult;

	const innerCallback = (err, result) => {
		if (err || result !== undefined) {
			if (inCall) {
				inCallResult = [err, result];
				return;
			}
			callback(err, result);
			return;
		}
		if (inCall) {
			inCallResult = true;
			return;
		}
		inCall = true;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (index === array.length) return callback();
			iterator(array[index++], innerCallback);
			if (inCallResult !== undefined) {
				if (inCallResult !== true) {
					return callback(...inCallResult);
				}
				inCallResult = undefined;
				// continue loop
			} else {
				inCall = false;
				return;
			}
		}
	};

	inCall = true;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (index === array.length) return callback();
		iterator(array[index++], innerCallback);
		if (inCallResult !== undefined) {
			if (inCallResult !== true) {
				return callback(...inCallResult);
			}
			inCallResult = undefined;
			// continue loop
		} else {
			inCall = false;
			return;
		}
	}
};
