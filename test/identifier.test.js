const { parseIdentifier } = require("../lib/util/identifier");
const { posixSep } = require("./util/path-separator");

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
			input: `path${posixSep}#`,
			expected: [`path${posixSep}`, "", "#"]
		},
		{
			input: `path${posixSep}as${posixSep}?`,
			expected: [`path${posixSep}as${posixSep}`, "?", ""]
		},
		{
			input: `path${posixSep}#${posixSep}?`,
			expected: [`path${posixSep}`, "", `#${posixSep}?`]
		},
		{
			input: `path${posixSep}#repo#hash`,
			expected: [`path${posixSep}`, "", "#repo#hash"]
		},
		{
			input: `path${posixSep}#r#hash`,
			expected: [`path${posixSep}`, "", "#r#hash"]
		},
		{
			input: `path${posixSep}#repo${posixSep}#repo2#hash`,
			expected: [`path${posixSep}`, "", `#repo${posixSep}#repo2#hash`]
		},
		{
			input: `path${posixSep}#r${posixSep}#r#hash`,
			expected: [`path${posixSep}`, "", `#r${posixSep}#r#hash`]
		},
		{
			input: `path${posixSep}#${posixSep}not${posixSep}a${posixSep}hash?not-a-query`,
			expected: [
				`path${posixSep}`,
				"",
				`#${posixSep}not${posixSep}a${posixSep}hash?not-a-query`
			]
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
			input: `path\\#${posixSep}not${posixSep}a${posixSep}hash?not-a-query`,
			expected: [
				"path\\",
				"",
				`#${posixSep}not${posixSep}a${posixSep}hash?not-a-query`
			]
		}
	];

	run(tests);
});
