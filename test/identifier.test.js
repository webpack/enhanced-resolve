"use strict";

const { parseIdentifier } = require("../lib/util/identifier");

/**
 * @typedef {{ input: string, expected: [string, string, string] }} TestSuite
 */

describe("identifier", () => {
	/**
	 * @param {TestSuite[]} suites suites
	 */
	function run(suites) {
		for (const { input, expected } of suites) {
			it(input, () => {
				const parsed = parseIdentifier(input);

				if (!parsed) throw new Error("should not be null");

				expect(parsed).toEqual(expected);
			});
		}
	}

	describe("parse identifier. edge cases", () => {
		/** @type {TestSuite[]} */
		const tests = [
			{
				input: "path/#",
				expected: ["path/", "", "#"],
			},
			{
				input: "path/as/?",
				expected: ["path/as/", "?", ""],
			},
			{
				input: "path/#/?",
				expected: ["path/", "", "#/?"],
			},
			{
				input: "path/#repo#hash",
				expected: ["path/", "", "#repo#hash"],
			},
			{
				input: "path/#r#hash",
				expected: ["path/", "", "#r#hash"],
			},
			{
				input: "path/#repo/#repo2#hash",
				expected: ["path/", "", "#repo/#repo2#hash"],
			},
			{
				input: "path/#r/#r#hash",
				expected: ["path/", "", "#r/#r#hash"],
			},
			{
				input: "path/#/not/a/hash?not-a-query",
				expected: ["path/", "", "#/not/a/hash?not-a-query"],
			},
			{
				input: "#\0?\0#ab\0\0c?\0#\0\0query#?#\0fragment",
				expected: ["#?#ab\0c", "?#\0query", "#?#\0fragment"],
			},
		];

		run(tests);
	});

	// Tests for https://github.com/webpack/webpack/issues/16819
	// To embed a literal '#' in a filesystem path, the caller must use the
	// '\0#' null-byte escape. Unescaped '#' always starts a fragment.
	describe("parse identifier. '#' escape with \\0", () => {
		/** @type {TestSuite[]} */
		const tests = [
			// '\0#' in path is unescaped to '#' (part of directory name), no fragment
			{
				input: "/home/user/projects/test\0#/webpack/src/file.js",
				expected: ["/home/user/projects/test#/webpack/src/file.js", "", ""],
			},
			// '\0#' dir name, with a real (unescaped) '#' fragment at the end
			{
				input: "/projects/test\0#app/src/file.js#fragment",
				expected: ["/projects/test#app/src/file.js", "", "#fragment"],
			},
			// Multiple '\0#' escapes in dir names, then a real fragment
			{
				input: "/a\0#b/c\0#d/file.js#hash",
				expected: ["/a#b/c#d/file.js", "", "#hash"],
			},
			// '\0#' dir name with both query and fragment
			{
				input: "/projects/test\0#app/file.js?query#fragment",
				expected: ["/projects/test#app/file.js", "?query", "#fragment"],
			},
			// Unescaped '#' mid-segment is still treated as a fragment start
			// (callers must escape '#' in paths via '\0#' — see webpack#16819)
			{
				input: "/home/user/projects/test#/webpack/src/file.js",
				expected: ["/home/user/projects/test#/webpack/src/file.js", "", ""],
			},
			{
				input: "/abs/path/file.js#fragment",
				expected: ["/abs/path/file.js", "", "#fragment"],
			},
		];

		run(tests);
	});

	describe("parse identifier. Windows-like paths", () => {
		/** @type {TestSuite[]} */
		const tests = [
			{
				input: "path\\#",
				expected: ["path\\", "", "#"],
			},
			{
				input: "C:path\\as\\?",
				expected: ["C:path\\as\\", "?", ""],
			},
			{
				input: "path\\#\\?",
				expected: ["path\\", "", "#\\?"],
			},
			{
				input: "path\\#repo#hash",
				expected: ["path\\", "", "#repo#hash"],
			},
			{
				input: "path\\#r#hash",
				expected: ["path\\", "", "#r#hash"],
			},
			{
				input: "path\\#/not/a/hash?not-a-query",
				expected: ["path\\", "", "#/not/a/hash?not-a-query"],
			},
			// Regression (webpack#16819): '\0#' null-byte escape correctly
			// embeds '#' in a Windows dir name (no fragment produced)
			{
				input: "C:\\Users\\test\0#proj\\webpack\\src\\file.js",
				expected: ["C:\\Users\\test#proj\\webpack\\src\\file.js", "", ""],
			},
			{
				input: "C:\\abs\\path\\file.js#fragment",
				expected: ["C:\\abs\\path\\file.js", "", "#fragment"],
			},
			// Without escaping, '#' still starts a fragment (caller must escape)
			{
				input: "C:\\Users\\test#proj\\webpack\\src\\file.js",
				expected: ["C:\\Users\\test#proj\\webpack\\src\\file.js", "", ""],
			},
		];

		run(tests);
	});

	describe("parse identifier. DOS device paths", () => {
		/** @type {TestSuite[]} */
		const tests = [
			// The literal `?` inside `\\?\` is part of the prefix, not a query
			// separator. Same for the `.` in `\\.\`.
			{
				input: "\\\\?\\C:\\foo",
				expected: ["\\\\?\\C:\\foo", "", ""],
			},
			{
				input: "\\\\.\\C:\\foo",
				expected: ["\\\\.\\C:\\foo", "", ""],
			},
			{
				input: "\\\\?\\UNC\\server\\share\\file.js",
				expected: ["\\\\?\\UNC\\server\\share\\file.js", "", ""],
			},
			// Query/fragment past the prefix are still parsed normally.
			{
				input: "\\\\?\\C:\\foo?bar=1",
				expected: ["\\\\?\\C:\\foo", "?bar=1", ""],
			},
			{
				input: "\\\\?\\C:\\foo#frag",
				expected: ["\\\\?\\C:\\foo", "", "#frag"],
			},
			{
				input: "\\\\?\\C:\\foo?q=1#f",
				expected: ["\\\\?\\C:\\foo", "?q=1", "#f"],
			},
			// `\\foo` (plain UNC-ish, not a DOS device path) should not trigger
			// the prefix skip — its `?` would still be a query separator. We
			// don't have one to test that the fallback still works unchanged.
			{
				input: "\\\\server\\share\\file.js",
				expected: ["\\\\server\\share\\file.js", "", ""],
			},
		];

		run(tests);
	});

	describe("parse identifier. malformed inputs", () => {
		it("returns null for a single null-byte input (regex no-match)", () => {
			expect(parseIdentifier("\0")).toBeNull();
		});

		it("returns null for an empty input", () => {
			expect(parseIdentifier("")).toBeNull();
		});
	});
});
