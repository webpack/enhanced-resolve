"use strict";

// Jest config is only consumed by the legacy CI matrix (Node.js < 18) where
// `node:test` is not available. Modern runs use `node --test` via
// scripts/test.js and ignore this file.
module.exports = {
	roots: ["<rootDir>/test"],
	moduleFileExtensions: ["js", "mjs", "cjs", "ts"],
	modulePathIgnorePatterns: ["<rootDir>/test/fixtures/"],
	setupFiles: ["<rootDir>/test/polyfill-text-encoding.js"],
};
