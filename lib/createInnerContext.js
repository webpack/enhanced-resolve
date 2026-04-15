/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver").ResolveContext} ResolveContext */
/** @typedef {import("./Resolver").StackEntryNode} StackEntryNode */

/**
 * Inner-context class. The resolver stores the recursion stack as a
 * plain singly-linked-list POJO on `_stack` (see `Resolver.doResolve`);
 * the `stack` getter materializes it as a `Set<string>` on demand so
 * the historic public API keeps working. The setter just stores what
 * a developer assigns and `doResolve` normalizes it on the next call.
 *
 * Using a class with a shared prototype keeps every inner context on
 * one hidden class, so V8 stays monomorphic on property access.
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
		/** @type {StackEntryNode | Set<string> | undefined} */
		this._stack = undefined;
	}

	/** @returns {Set<string> | undefined} the stack as a Set<string> */
	get stack() {
		const stack = this._stack;
		if (stack === undefined || stack instanceof Set) {
			return /** @type {Set<string> | undefined} */ (stack);
		}
		const set = new Set();
		/** @type {StackEntryNode[]} */
		const chain = [];
		/** @type {StackEntryNode | undefined} */
		let cur = stack;
		while (cur !== undefined) {
			chain.push(cur);
			cur = cur.parent;
		}
		for (let i = chain.length - 1; i >= 0; i--) {
			set.add(chain[i].entry);
		}
		return set;
	}

	/** @param {Set<string> | undefined} value new stack */
	set stack(value) {
		this._stack = value;
	}
}

/**
 * @param {ResolveContext & { _stack?: StackEntryNode | Set<string> }} options options for inner context
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
	return /** @type {ResolveContext} */ (/** @type {unknown} */ (ctx));
};
