const { parseIdentifier } = require("../lib/util/identifier");

/**
 * @typedef {{input: string, expected: [string, string, string]}} TestSuite
 */

/**
 * @param {TestSuite[]} suites suites
 */
function run(suites) {
	suites.forEach(({ input, expected }) => {
		it(input, () => {
			const parsed = parseIdentifier(input);

			if (!parsed) throw new Error("should not be null");

			expect(parsed).toEqual(expected);
		});
	});
}

describe("parse identifier. edge cases", () => {
	/** @type {TestSuite[]} */
	const tests = [
		{
			input: "path/#",
			expected: ["path/", "", "#"]
		},
		{
			input: "path/as/?",
			expected: ["path/as/", "?", ""]
		},
		{
			input: "path/#/?",
			expected: ["path/", "", "#/?"]
		},
		{
			input: "path/#repo#hash",
			expected: ["path/", "", "#repo#hash"]
		},
		{
			input: "path/#r#hash",
			expected: ["path/", "", "#r#hash"]
		},
		{
			input: "path/#repo/#repo2#hash",
			expected: ["path/", "", "#repo/#repo2#hash"]
		},
		{
			input: "path/#r/#r#hash",
			expected: ["path/", "", "#r/#r#hash"]
		},
		{
			input: "path/#/not/a/hash?not-a-query",
			expected: ["path/", "", "#/not/a/hash?not-a-query"]
		}
	];

	run(tests);
});

describe("parse identifier. Windows-like paths", () => {
	/** @type {TestSuite[]} */
	const tests = [
		{
			input: "path\\#",
			expected: ["path\\", "", "#"]
		},
		{
			input: "C:path\\as\\?",
			expected: ["C:path\\as\\", "?", ""]
		},
		{
			input: "path\\#\\?",
			expected: ["path\\", "", "#\\?"]
		},
		{
			input: "path\\#repo#hash",
			expected: ["path\\", "", "#repo#hash"]
		},
		{
			input: "path\\#r#hash",
			expected: ["path\\", "", "#r#hash"]
		},
		{
			input: "path\\#/not/a/hash?not-a-query",
			expected: ["path\\", "", "#/not/a/hash?not-a-query"]
		}
	];

	run(tests);
});
