"use strict";

// TODO: drop this file together with `test/_runner.js`'s jest branch and the
// legacy-only steps in the `test` CI job once `engines.node` is bumped to >= 18.

// Jest config is only consumed by the legacy leg of the test matrix
// (Node.js < 18) where `node:test` is not available. Modern runs use
// `node --test` via scripts/test.js and ignore this file.
module.exports = {
	roots: ["<rootDir>/test"],
	moduleFileExtensions: ["js", "mjs", "cjs", "ts"],
	modulePathIgnorePatterns: ["<rootDir>/test/fixtures/"],
	setupFiles: ["<rootDir>/test/polyfill-text-encoding.js"],
};
