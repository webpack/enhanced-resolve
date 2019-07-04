/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = function forEachBail(array, iterator, callback) {
	if (array.length === 0) return callback();

	let index = 0;
	let inCall = true;
	let inCallResult;

	const innerCallback = (...args) => {
		if (inCall) {
			inCallResult = args;
			return;
		}
		if (args.length > 0) {
			callback(...args);
			return;
		}
		inCall = true;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (index === array.length) return callback();
			iterator(array[index++], innerCallback);
			if (inCallResult) {
				if (inCallResult.length > 0) {
					return callback(...inCallResult);
				}
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
		if (inCallResult) {
			if (inCallResult.length > 0) {
				return callback(...inCallResult);
			}
		} else {
			inCall = false;
			return;
		}
	}
};

module.exports.withIndex = function forEachBailWithIndex(
	array,
	iterator,
	callback
) {
	if (array.length === 0) return callback();

	let index = 0;
	let inCall = true;
	let inCallResult;

	const innerCallback = (...args) => {
		if (inCall) {
			inCallResult = args;
			return;
		}
		if (args.length > 0) {
			callback(...args);
			return;
		}
		inCall = true;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (index === array.length) return callback();
			const i = index;
			iterator(array[index++], i, innerCallback);
			if (inCallResult) {
				if (inCallResult.length > 0) {
					return callback(...inCallResult);
				}
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
		const i = index;
		iterator(array[index++], i, innerCallback);
		if (inCallResult) {
			if (inCallResult.length > 0) {
				return callback(...inCallResult);
			}
		} else {
			inCall = false;
			return;
		}
	}
};
