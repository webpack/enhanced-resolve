"use strict";

/* eslint-disable jsdoc/reject-any-type */

// Pure-function tests for helpers exported by DescriptionFileUtils, matching
// the style of test/getPaths.test.js and test/identifier.test.js for lib/
// modules whose helpers are difficult to exercise end-to-end.
const DescriptionFileUtils = require("../lib/DescriptionFileUtils");

describe("DescriptionFileUtils.cdUp", () => {
	it("returns null for '/'", () => {
		expect(DescriptionFileUtils.cdUp("/")).toBeNull();
	});

	it("returns null for inputs without separators", () => {
		// cspell:ignore noslash
		expect(DescriptionFileUtils.cdUp("noslash")).toBeNull();
	});

	it("returns '/' when stripping the last directory", () => {
		expect(DescriptionFileUtils.cdUp("/foo")).toBe("/");
	});

	it("descends one level for posix paths", () => {
		expect(DescriptionFileUtils.cdUp("/a/b/c")).toBe("/a/b");
	});

	it("descends one level for windows paths", () => {
		expect(DescriptionFileUtils.cdUp("C:\\a\\b\\c")).toBe("C:\\a\\b");
	});
});

describe("DescriptionFileUtils.getField", () => {
	it("returns undefined for empty content", () => {
		expect(
			DescriptionFileUtils.getField(/** @type {any} */ (null), "x"),
		).toBeUndefined();
	});

	it("walks an array field path", () => {
		const data = { a: { b: { c: 42 } } };
		expect(
			DescriptionFileUtils.getField(/** @type {any} */ (data), ["a", "b", "c"]),
		).toBe(42);
	});

	it("returns null when the path is broken mid-traversal", () => {
		expect(
			DescriptionFileUtils.getField(/** @type {any} */ ({ a: 1 }), ["a", "b"]),
		).toBeNull();
	});

	it("returns the field value for a string field", () => {
		expect(
			DescriptionFileUtils.getField(/** @type {any} */ ({ name: "x" }), "name"),
		).toBe("x");
	});
});
