/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

module.exports = function forEachBail(array, iterator, callback) {
	if (array.length === 0) return callback();

	let handlerList = array.map(value => {
		return next => {
			return () => {
				iterator(value, (err, result) => {
					if (err || result !== undefined) {
						return callback(err, result);
					}
					next();
				});
			};
		};
	});

	let entry = handlerList.reduceRight((a, b) => b(a), () => callback());
	entry();
};
