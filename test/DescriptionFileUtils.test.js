"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");

/* eslint-disable jsdoc/reject-any-type */

// Pure-function tests for helpers exported by DescriptionFileUtils, matching
// the style of test/getPaths.test.js and test/identifier.test.js for lib/
// modules whose helpers are difficult to exercise end-to-end.
const DescriptionFileUtils = require("../lib/DescriptionFileUtils");

describe("DescriptionFileUtils.cdUp", () => {
	it("returns null for '/'", () => {
		assert.strictEqual(DescriptionFileUtils.cdUp("/"), null);
	});

	it("returns null for inputs without separators", () => {
		// cspell:ignore noslash
		assert.strictEqual(DescriptionFileUtils.cdUp("noslash"), null);
	});

	it("returns '/' when stripping the last directory", () => {
		assert.strictEqual(DescriptionFileUtils.cdUp("/foo"), "/");
	});

	it("descends one level for posix paths", () => {
		assert.strictEqual(DescriptionFileUtils.cdUp("/a/b/c"), "/a/b");
	});

	it("descends one level for windows paths", () => {
		assert.strictEqual(DescriptionFileUtils.cdUp("C:\\a\\b\\c"), "C:\\a\\b");
	});
});

describe("DescriptionFileUtils.getField", () => {
	it("returns undefined for empty content", () => {
		assert.strictEqual(
			DescriptionFileUtils.getField(/** @type {any} */ (null), "x"),
			undefined,
		);
	});

	it("walks an array field path", () => {
		const data = { a: { b: { c: 42 } } };
		assert.strictEqual(
			DescriptionFileUtils.getField(/** @type {any} */ (data), ["a", "b", "c"]),
			42,
		);
	});

	it("returns null when the path is broken mid-traversal", () => {
		assert.strictEqual(
			DescriptionFileUtils.getField(/** @type {any} */ ({ a: 1 }), ["a", "b"]),
			null,
		);
	});

	it("returns the field value for a string field", () => {
		assert.strictEqual(
			DescriptionFileUtils.getField(/** @type {any} */ ({ name: "x" }), "name"),
			"x",
		);
	});
});
