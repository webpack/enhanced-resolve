require("should");
const { parseIdentifier } = require("../lib/util/identifier");

/**
 * @typedef {{input: string, expect: [string, string, string]}} TestSuite
 */

/**
 * @param {TestSuite[]} suites suites
 */
function run(suites) {
	suites.forEach(({ input, expect }) => {
		it(input, () => {
			const parsed = parseIdentifier(input);

			if (!parsed) throw new Error("should not be null");

			parsed.should.eql(expect);
		});
	});
}

describe("parse identifier. edge cases", () => {
	/** @type {TestSuite[]} */
	const tests = [
		{
			input: "path/#",
			expect: ["path/", "", "#"]
		},
		{
			input: "path/as/?",
			expect: ["path/as/", "?", ""]
		},
		{
			input: "path/#/?",
			expect: ["path/", "", "#/?"]
		},
		{
			input: "path/#repo#hash",
			expect: ["path/", "", "#repo#hash"]
		},
		{
			input: "path/#r#hash",
			expect: ["path/", "", "#r#hash"]
		},
		{
			input: "path/#repo/#repo2#hash",
			expect: ["path/", "", "#repo/#repo2#hash"]
		},
		{
			input: "path/#r/#r#hash",
			expect: ["path/", "", "#r/#r#hash"]
		},
		{
			input: "path/#/not/a/hash?not-a-query",
			expect: ["path/", "", "#/not/a/hash?not-a-query"]
		}
	];

	run(tests);
});

describe("parse identifier. Windows-like paths", () => {
	/** @type {TestSuite[]} */
	const tests = [
		{
			input: "path\\#",
			expect: ["path\\", "", "#"]
		},
		{
			input: "C:path\\as\\?",
			expect: ["C:path\\as\\", "?", ""]
		},
		{
			input: "path\\#\\?",
			expect: ["path\\", "", "#\\?"]
		},
		{
			input: "path\\#repo#hash",
			expect: ["path\\", "", "#repo#hash"]
		},
		{
			input: "path\\#r#hash",
			expect: ["path\\", "", "#r#hash"]
		},
		{
			input: "path\\#/not/a/hash?not-a-query",
			expect: ["path\\", "", "#/not/a/hash?not-a-query"]
		}
	];

	run(tests);
});
