"use strict";

const assert = require("assert");
const stripJsonComments = require("../lib/util/strip-json-comments");
const { describe, it } = require("./_runner");

/* eslint-disable jsdoc/reject-any-type */

describe("util/strip-json-comments", () => {
	it("throws when given a non-string", () => {
		assert.throws(() => stripJsonComments(/** @type {any} */ (42)), TypeError);
	});

	it("removes single-line comments (default: replace with whitespace)", () => {
		const input = '{"a": 1} // comment';
		const result = stripJsonComments(input);
		assert.strictEqual(result.length, input.length);
		assert.strictEqual(result.trim(), '{"a": 1}');
	});

	it("removes single-line comments without whitespace when whitespace:false", () => {
		const result = stripJsonComments('{"a": 1} // comment', {
			whitespace: false,
		});
		assert.strictEqual(result, '{"a": 1} ');
	});

	it("handles single-line comments terminated by \\r\\n", () => {
		const result = stripJsonComments('{"a": 1} // c\r\n"b"');
		assert.strictEqual(result, '{"a": 1}     \r\n"b"');
	});

	it("handles single-line comments terminated by \\n", () => {
		const input = '{"a": 1} // c\n"b"';
		const result = stripJsonComments(input);
		assert.strictEqual(result.length, input.length);
		assert.ok(result.includes("\n"));
		assert.ok(result.includes('"b"'));
	});

	it("removes multi-line comments", () => {
		const input = '{"a": 1} /* a\nb */ "c"';
		const result = stripJsonComments(input);
		assert.strictEqual(result.length, input.length);
		assert.ok(result.includes('"c"'));
		assert.ok(!result.includes("/*"));
	});

	it("does not remove comments inside strings", () => {
		const result = stripJsonComments('{"a": "// not a comment"}');
		assert.strictEqual(result, '{"a": "// not a comment"}');
	});

	it("treats escaped quotes correctly", () => {
		const result = stripJsonComments('{"a": "x\\"//y"} // c');
		assert.strictEqual(result, '{"a": "x\\"//y"}     ');
	});

	it("strips trailing commas when trailingCommas:true", () => {
		const result = stripJsonComments('{"a": 1,}', { trailingCommas: true });
		assert.strictEqual(result, '{"a": 1 }');
	});

	it("keeps non-trailing commas when trailingCommas:true", () => {
		const result = stripJsonComments('{"a": 1, "b": 2}', {
			trailingCommas: true,
		});
		assert.strictEqual(result, '{"a": 1, "b": 2}');
	});

	it("strips trailing commas before ]", () => {
		const result = stripJsonComments("[1, 2, 3,]", { trailingCommas: true });
		assert.strictEqual(result, "[1, 2, 3 ]");
	});

	it("handles an unterminated multiline comment at end of input", () => {
		const result = stripJsonComments('{"a": 1} /* unterminated');
		// Multiline comments without closing */ are not stripped
		assert.strictEqual(result, '{"a": 1} /* unterminated');
	});

	it("parses valid JSONC into valid JSON", () => {
		const jsonc =
			'{\n\t// a comment\n\t"a": 1, /* nested */\n\t"b": [1, 2,],\n}';
		const cleaned = stripJsonComments(jsonc, {
			trailingCommas: true,
			whitespace: true,
		});
		assert.doesNotThrow(() => JSON.parse(cleaned));
		assert.deepStrictEqual(JSON.parse(cleaned), { a: 1, b: [1, 2] });
	});
});
