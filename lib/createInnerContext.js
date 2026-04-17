/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver").ResolveContext} ResolveContext */

/**
 * Build the inner resolve context handed to the next hook in `doResolve`.
 *
 * Previously the caller built an intermediate object literal with 6 fields
 * just to pass it in; this function then returned another fresh object with
 * the same shape. Two allocations per `doResolve` call — and `doResolve` is
 * on the hottest path in the resolver. This signature takes the outer
 * context plus the new stack directly, so we only allocate once.
 * @param {ResolveContext} outer outer resolve context
 * @param {import("./Resolver").ResolveContext["stack"]} stack stack entry to propagate
 * @param {null | string} message message to log (non-null makes `log` lazy)
 * @returns {ResolveContext} inner context
 */
module.exports = function createInnerContext(outer, stack, message) {
	const outerLog = outer.log;
	let innerLog;
	if (outerLog) {
		if (message) {
			let messageReported = false;
			/**
			 * @param {string} msg message
			 */
			innerLog = (msg) => {
				if (!messageReported) {
					outerLog(message);
					messageReported = true;
				}
				outerLog(`  ${msg}`);
			};
		} else {
			innerLog = outerLog;
		}
	}

	return {
		log: innerLog,
		yield: outer.yield,
		fileDependencies: outer.fileDependencies,
		contextDependencies: outer.contextDependencies,
		missingDependencies: outer.missingDependencies,
		stack,
	};
};
