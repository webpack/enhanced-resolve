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

// Bridge between `node:test` and jest so a single test source runs on:
//   - Node.js 18+ via the built-in `node --test` runner.
//   - Legacy Node.js (10-16) via jest, which doesn't ship `node:test`.
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
	// inject a throwaway `t` when jest invokes the function.
	const wrap = (fn) =>
		typeof fn === "function" && fn.length >= 2
			? function bridged(done) {
					return fn.call(this, {}, done);
				}
			: fn;
	const named = (register) => (name, fn) => register(name, wrap(fn));

	module.exports = {
		// `describe.skip` is the only host-level skip the suite uses
		// (dos-device-paths on non-Windows), and jest, bun and node:test all
		// expose `.skip` on the `describe` object itself, so passing the
		// runtime's `describe` through unchanged is enough. `it`/`test` are
		// only wrapped to bridge the `(t, done)` callback signature; no
		// `.skip`/`.only` is exposed because the suite does not use them
		// (and bun, in particular, does not put `.skip` on `global.it`).
		describe: global.describe,
		it: named(global.it),
		test: named(global.test),
		before: global.beforeAll,
		after: global.afterAll,
		beforeEach: global.beforeEach,
		afterEach: global.afterEach,
	};
}
