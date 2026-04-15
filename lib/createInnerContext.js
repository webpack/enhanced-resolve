/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver").ResolveContext} ResolveContext */
/** @typedef {import("./Resolver").StackEntryNode} StackEntryNode */

/**
 * @param {StackEntryNode | undefined} tip linked list tip
 * @param {Set<string> | undefined} seed initial entries
 * @returns {Set<string> | undefined} materialized set or undefined
 */
function stackView(tip, seed) {
	if (tip === undefined) return seed;
	/** @type {StackEntryNode[]} */
	const chain = [];
	/** @type {StackEntryNode | undefined} */
	let cur = tip;
	while (cur !== undefined) {
		chain.push(cur);
		cur = cur.parent;
	}
	const set = seed !== undefined ? new Set(seed) : new Set();
	for (let i = chain.length - 1; i >= 0; i--) {
		set.add(chain[i].entry);
	}
	return set;
}

/**
 * Inner-`ResolveContext` class. The resolver keeps its recursion stack
 * internally as a singly-linked list of POJOs (`_stackTip`) plus an
 * optional seed `Set<string>` (`_stackSeed`) carried forward when a
 * caller uses the public API with `{ stack: new Set(...) }`. The
 * `stack` getter materializes those into a `Set<string>` on demand so
 * the historic public surface keeps working; the setter drops any
 * linked-list tip and carries the supplied set forward as the seed.
 *
 * The class (instead of a per-call object literal with accessors) means
 * every inner context shares the same hidden class — V8 can keep
 * property access monomorphic on the hot path.
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
		this._stackTip = undefined;
		/** @type {Set<string> | undefined} */
		this._stackSeed = undefined;
	}

	/**
	 * @returns {Set<string> | undefined} materialized stack as Set<string>
	 */
	get stack() {
		return stackView(this._stackTip, this._stackSeed);
	}

	/**
	 * @param {Set<string> | undefined} value new stack (treated as seed)
	 */
	set stack(value) {
		this._stackTip = undefined;
		this._stackSeed = value;
	}
}

/**
 * @param {ResolveContext & { _stackTip?: StackEntryNode, _stackSeed?: Set<string> }} options options for inner context
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
	ctx._stackTip = options._stackTip;
	ctx._stackSeed = options._stackSeed;
	return ctx;
};
