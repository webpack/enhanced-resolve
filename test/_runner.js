// @ts-nocheck
// (This bridge is intentionally untyped: it branches on the runtime
// (jest vs node:test) and patches `assert` at module load. The assertion
// polyfills mirror Node's real `assert.match`/`assert.doesNotMatch` shape,
// and the jest branch only runs when the `jest` global is in scope.)

"use strict";

// TODO: drop this file once `engines.node` is bumped to >= 18. The test
// files can then `require("node:test")` directly, the jest bridge below
// is no longer reachable, and the `assert.match`/`doesNotMatch` polyfills
// (needed only on Node.js < 13.6) become dead code.

// Bridge between `node:test` and jest-compatible runners so a single test
// source runs on:
//   - Node.js 18+ via the built-in `node --test` runner.
//   - Legacy Node.js (10-16) via jest, which doesn't ship `node:test`.
//   - Bun via its built-in jest-compatible runner.
// The runtime is auto-detected by the presence of jest's `jest` global.

const assert = require("assert");

// `assert.match` and `assert.doesNotMatch` were added in Node.js 13.6. Legacy
// jest CI also runs on Node.js 10/12, so polyfill them when missing. The
// signature mirrors the built-in.
if (typeof assert.match !== "function") {
	assert.match = function match(value, regExp, message) {
		if (!regExp.test(value)) {
			throw new assert.AssertionError({
				message:
					message ||
					`The input did not match the regular expression ${regExp}. Input:\n\n${value}\n`,
				actual: value,
				expected: regExp,
				operator: "match",
			});
		}
	};
}
if (typeof assert.doesNotMatch !== "function") {
	assert.doesNotMatch = function doesNotMatch(value, regExp, message) {
		if (regExp.test(value)) {
			throw new assert.AssertionError({
				message:
					message ||
					`The input matched the regular expression ${regExp}. Input:\n\n${value}\n`,
				actual: value,
				expected: regExp,
				operator: "doesNotMatch",
			});
		}
	};
}

// Adapt a jest-shaped helper bag (jest's globals or `bun:test`) to the
// node:test surface the test files use. jest-style callbacks take `(done)`;
// node:test passes `(t, done)`, so wrap to inject a throwaway `t` when the
// jest-compatible runner invokes the test function. `describe` is passed
// through unchanged so `describe.skip` keeps working on every runtime
// (the only host-level skip the suite uses).
const wrap = (fn) =>
	typeof fn === "function" && fn.length >= 2
		? function bridged(done) {
				return fn.call(this, {}, done);
			}
		: fn;
const named = (register) => (name, fn) => register(name, wrap(fn));
const bridge = (source) => ({
	describe: source.describe,
	it: named(source.it),
	test: named(source.test),
	before: source.beforeAll,
	after: source.afterAll,
	beforeEach: source.beforeEach,
	afterEach: source.afterEach,
});

// Pick the source of the test helpers based on the runtime:
//   - Bun: always use `bun:test`. Bun ships its own (partial) `node:test`
//     implementation that throws on top-level `describe()` calls in some
//     setups; `bun:test` is the supported entry point.
//   - jest (no `Bun` global, `jest` global is in scope): use jest's helpers,
//     which jest attaches to `global`. This is the legacy-Node and Deno path.
//   - Otherwise: the Node.js built-in `node:test`.
if (typeof Bun !== "undefined") {
	// eslint-disable-next-line import/no-unresolved
	module.exports = bridge(require("bun:test"));
} else if (typeof jest === "undefined") {
	module.exports = require("node:test");
} else {
	module.exports = bridge(global);
}
