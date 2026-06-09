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

if (typeof jest === "undefined") {
	module.exports = require("node:test");
} else {
	// jest's callback-style test function takes `(done)`; node:test passes
	// `(t, done)`. The migrated tests use the node:test shape, so wrap to
	// inject a throwaway `t` when the jest-compatible runner invokes them.
	const wrap = (fn) =>
		typeof fn === "function" && fn.length >= 2
			? function bridged(done) {
					return fn.call(this, {}, done);
				}
			: fn;
	const named = (register) => (name, fn) => register(name, wrap(fn));

	// jest in Node.js attaches its helpers to `global`; Bun exposes them
	// only through the `bun:test` module (Bun defines the `jest` compat global
	// but does *not* mirror jest's helpers on `global`). Source from the
	// place that actually has them.
	const source =
		typeof Bun === "undefined"
			? global
			: // eslint-disable-next-line import/no-unresolved
				require("bun:test");

	module.exports = {
		// `describe.skip` is the only host-level skip the suite uses
		// (dos-device-paths on non-Windows). jest, Bun and node:test all
		// expose `.skip` on the `describe` object itself, so passing it
		// through unchanged is enough. `it`/`test` are only wrapped to bridge
		// the `(t, done)` callback signature; no `.skip`/`.only` is exposed
		// because the suite does not use them (and Bun does not put `.skip`
		// on its `it` global).
		describe: source.describe,
		it: named(source.it),
		test: named(source.test),
		before: source.beforeAll,
		after: source.afterAll,
		beforeEach: source.beforeEach,
		afterEach: source.afterEach,
	};
}
