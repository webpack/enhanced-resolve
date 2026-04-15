"use strict";

/* eslint-disable jsdoc/reject-any-type */

const stripJsonComments = require("../lib/util/strip-json-comments");

describe("util/strip-json-comments", () => {
	it("throws when given a non-string", () => {
		expect(() => stripJsonComments(/** @type {any} */ (42))).toThrow(TypeError);
	});

	it("removes single-line comments (default: replace with whitespace)", () => {
		const input = '{"a": 1} // comment';
		const result = stripJsonComments(input);
		expect(result).toHaveLength(input.length);
		expect(result.trim()).toBe('{"a": 1}');
	});

	it("removes single-line comments without whitespace when whitespace:false", () => {
		const result = stripJsonComments('{"a": 1} // comment', {
			whitespace: false,
		});
		expect(result).toBe('{"a": 1} ');
	});

	it("handles single-line comments terminated by \\r\\n", () => {
		const result = stripJsonComments('{"a": 1} // c\r\n"b"');
		expect(result).toBe('{"a": 1}     \r\n"b"');
	});

	it("handles single-line comments terminated by \\n", () => {
		const input = '{"a": 1} // c\n"b"';
		const result = stripJsonComments(input);
		expect(result).toHaveLength(input.length);
		expect(result).toContain("\n");
		expect(result).toContain('"b"');
	});

	it("removes multi-line comments", () => {
		const input = '{"a": 1} /* a\nb */ "c"';
		const result = stripJsonComments(input);
		expect(result).toHaveLength(input.length);
		expect(result).toContain('"c"');
		expect(result).not.toMatch("/*");
	});

	it("does not remove comments inside strings", () => {
		const result = stripJsonComments('{"a": "// not a comment"}');
		expect(result).toBe('{"a": "// not a comment"}');
	});

	it("treats escaped quotes correctly", () => {
		const result = stripJsonComments('{"a": "x\\"//y"} // c');
		expect(result).toBe('{"a": "x\\"//y"}     ');
	});

	it("strips trailing commas when trailingCommas:true", () => {
		const result = stripJsonComments('{"a": 1,}', { trailingCommas: true });
		expect(result).toBe('{"a": 1 }');
	});

	it("keeps non-trailing commas when trailingCommas:true", () => {
		const result = stripJsonComments('{"a": 1, "b": 2}', {
			trailingCommas: true,
		});
		expect(result).toBe('{"a": 1, "b": 2}');
	});

	it("strips trailing commas before ]", () => {
		const result = stripJsonComments("[1, 2, 3,]", { trailingCommas: true });
		expect(result).toBe("[1, 2, 3 ]");
	});

	it("handles an unterminated multiline comment at end of input", () => {
		const result = stripJsonComments('{"a": 1} /* unterminated');
		// Multiline comments without closing */ are not stripped
		expect(result).toBe('{"a": 1} /* unterminated');
	});

	it("parses valid JSONC into valid JSON", () => {
		const jsonc =
			'{\n\t// a comment\n\t"a": 1, /* nested */\n\t"b": [1, 2,],\n}';
		const cleaned = stripJsonComments(jsonc, {
			trailingCommas: true,
			whitespace: true,
		});
		expect(() => JSON.parse(cleaned)).not.toThrow();
		expect(JSON.parse(cleaned)).toEqual({ a: 1, b: [1, 2] });
	});
});
