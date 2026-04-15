/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver").ResolveContext} ResolveContext */
/** @typedef {import("./Resolver").StackEntryNode} StackEntryNode */

/**
 * Materializes a `Set<string>` view of the stack. Used by the `stack`
 * getter on an inner context (so external consumers keep seeing the
 * historic `Set<string>` API) and by the recursion-error message.
 * @param {StackEntryNode | undefined} tip linked-list tip
 * @returns {Set<string>} a fresh Set containing every entry in the stack
 */
function stackToSet(tip) {
	const set = new Set();
	/** @type {StackEntryNode[]} */
	const chain = [];
	while (tip !== undefined) {
		chain.push(tip);
		tip = tip.parent;
	}
	for (let i = chain.length - 1; i >= 0; i--) {
		set.add(chain[i].entry);
	}
	return set;
}

/**
 * Inner `ResolveContext` class. The resolver keeps its recursion stack
 * internally as a singly-linked list of POJOs on `_stack`. The `stack`
 * getter materializes that into a `Set<string>` on demand — only when a
 * developer actually reads the property — so the historic public API
 * keeps working without costing anything on the hot path. The setter
 * just stores whatever the developer assigns (a fresh `Set<string>` is
 * converted to linked-list nodes by `doResolve` on the next call).
 *
 * Using a class (with a shared prototype) keeps every inner context on
 * the same hidden class so V8 can stay monomorphic on property access.
 */
class InnerResolveContext {
	constructor() {
		/** @type {((str: string) => void) | undefined} */
		this.log = undefined;
		/** @type {import("./Resolver").ResolveContextYield | undefined} */
		this.yield = undefined;
		/** @type {import("./Resolver").WriteOnlySet<string> | undefined} */
		this.fileDependencies = undefined;
		/** @type {import("./Resolver").WriteOnlySet<string> | undefined} */
		this.contextDependencies = undefined;
		/** @type {import("./Resolver").WriteOnlySet<string> | undefined} */
		this.missingDependencies = undefined;
		/** @type {StackEntryNode | undefined} */
		this._stack = undefined;
	}

	/** @returns {Set<string> | undefined} the stack as a Set<string> */
	get stack() {
		return this._stack === undefined ? undefined : stackToSet(this._stack);
	}

	/** @param {Set<string> | undefined} value new stack */
	set stack(value) {
		// Stored as-is; `doResolve` converts a `Set` to linked-list nodes
		// on its next invocation so the rest of the internal code path
		// only has to deal with the linked-list form.
		this._stack = /** @type {StackEntryNode | undefined} */ (
			/** @type {unknown} */ (value)
		);
	}
}

/**
 * @param {ResolveContext & { _stack?: StackEntryNode }} options options for inner context
 * @param {null | string} message message to log
 * @returns {ResolveContext} inner context
 */
module.exports = function createInnerContext(options, message) {
	let messageReported = false;
	/** @type {((str: string) => void) | undefined} */
	let innerLog;
	if (options.log) {
		if (message) {
			/**
			 * @param {string} msg message
			 */
			innerLog = (msg) => {
				if (!messageReported) {
					/** @type {((str: string) => void)} */
					(options.log)(message);
					messageReported = true;
				}
				/** @type {((str: string) => void)} */
				(options.log)(`  ${msg}`);
			};
		} else {
			innerLog = options.log;
		}
	}

	const ctx = new InnerResolveContext();
	ctx.log = innerLog;
	ctx.yield = options.yield;
	ctx.fileDependencies = options.fileDependencies;
	ctx.contextDependencies = options.contextDependencies;
	ctx.missingDependencies = options.missingDependencies;
	ctx._stack = options._stack;
	return ctx;
};

module.exports.stackToSet = stackToSet;
