"use strict";

const assert = require("assert");
const {
	explainSubpathsInConditions,
	processExportsField,
	processImportsField,
} = require("../lib/util/entrypoints");
const { describe, it } = require("./_runner");

describe("util/entrypoints processExportsField", () => {
	it("throws when the request ends with '/' (file required)", () => {
		const processor = processExportsField({ ".": "./index.js" });
		assert.throws(
			() => processor("./", new Set(["node"])),
			/Only requesting file allowed/,
		);
	});

	it("throws when the request does not start with '.'", () => {
		const processor = processExportsField({ ".": "./index.js" });
		assert.throws(
			() => processor("foo", new Set(["node"])),
			/should be relative path and start with "\."/,
		);
	});

	it("throws when the request length>1 but second char is not '/'", () => {
		const processor = processExportsField({ ".": "./index.js" });
		assert.throws(
			() => processor("..foo", new Set(["node"])),
			/should be relative path and start with "\.\/"/,
		);
	});

	it("returns an empty array for an unmatched export key", () => {
		const processor = processExportsField({ ".": "./main.js" });
		const [paths] = processor("./not-listed", new Set(["node"]));
		assert.deepStrictEqual(paths, []);
	});

	it("matches a direct mapping", () => {
		const processor = processExportsField({ "./a": "./main.js" });
		const [paths] = processor("./a", new Set(["node"]));
		assert.deepStrictEqual(paths, ["./main.js"]);
	});

	it("orders sibling pattern keys consistently", () => {
		const processor = processExportsField({
			"./longer/*": "./l/*",
			"./a/*": "./a/*",
			"./shortest": "./s.js",
		});
		const [paths1] = processor("./shortest", new Set(["node"]));
		assert.deepStrictEqual(paths1, ["./s.js"]);
		const [paths2] = processor("./a/foo", new Set(["node"]));
		assert.deepStrictEqual(paths2, ["./a/foo"]);
		const [paths3] = processor("./longer/foo", new Set(["node"]));
		assert.deepStrictEqual(paths3, ["./l/foo"]);
	});
});

describe("util/entrypoints processImportsField", () => {
	it("throws when the request does not start with '#'", () => {
		const processor = processImportsField({ "#a": "./main.js" });
		assert.throws(
			() => processor("foo", new Set(["node"])),
			/should start with "#"/,
		);
	});

	it("throws when request is just '#' (too short)", () => {
		const processor = processImportsField({ "#a": "./main.js" });
		assert.throws(
			() => processor("#", new Set(["node"])),
			/at least 2 characters/,
		);
	});

	it("throws when import request ends with '/'", () => {
		const processor = processImportsField({ "#a": "./main.js" });
		assert.throws(
			() => processor("#a/", new Set(["node"])),
			/Only requesting file allowed/,
		);
	});

	it("returns an empty array for an unmatched import key", () => {
		const processor = processImportsField({ "#a": "./main.js" });
		const [paths] = processor("#x", new Set(["node"]));
		assert.deepStrictEqual(paths, []);
	});

	it("matches a direct import key", () => {
		const processor = processImportsField({ "#a": "./main.js" });
		const [paths] = processor("#a", new Set(["node"]));
		assert.deepStrictEqual(paths, ["./main.js"]);
	});
});

// https://github.com/webpack/enhanced-resolve/issues/325
describe("util/entrypoints explainSubpathsInConditions", () => {
	it("explains a condition that wraps subpaths", () => {
		const explanation = explainSubpathsInConditions(
			{
				import: { ".": "./esm/index.js", "./*": "./esm/*.js" },
				require: "./build/bundle.js",
			},
			true,
		);
		assert.match(
			/** @type {string} */ (explanation),
			/the value at "import" is an object with subpath keys \(".", ".\/\*"\)/,
		);
		// and shows the arrangement that works
		assert.match(
			/** @type {string} */ (explanation),
			/"\.": \{ "import": \.\.\. \}, ".\/\*": \{ "import": \.\.\. \}/,
		);
	});

	it("reports the full path to a nested offender", () => {
		const explanation = explainSubpathsInConditions(
			{ "./foo": { node: { import: { "./x": "./x.js" } } } },
			true,
		);
		assert.match(
			/** @type {string} */ (explanation),
			/the value at ".\/foo" -> "node" -> "import"/,
		);
	});

	it("looks inside array targets", () => {
		const explanation = explainSubpathsInConditions(
			{ "./foo": ["./a.js", { node: { "./x": "./x.js" } }] },
			true,
		);
		assert.match(
			/** @type {string} */ (explanation),
			/the value at ".\/foo" -> "node"/,
		);
	});

	it("explains the imports counterpart", () => {
		const explanation = explainSubpathsInConditions(
			{ "#a": { node: { "#b": "./x.js" } } },
			false,
		);
		assert.match(
			/** @type {string} */ (explanation),
			/the value at "#a" -> "node" is an object with subpath keys \("#b"\)/,
		);
	});

	it("returns null for a well-formed exports field", () => {
		assert.strictEqual(
			explainSubpathsInConditions(
				{
					".": { import: "./esm/index.js", require: "./cjs/index.js" },
					"./*": { import: "./esm/*.js", require: "./cjs/*.js" },
				},
				true,
			),
			null,
		);
	});

	it("returns null for a well-formed imports field and for non-objects", () => {
		assert.strictEqual(
			explainSubpathsInConditions({ "#a": { node: "./x.js" } }, false),
			null,
		);
		assert.strictEqual(explainSubpathsInConditions("./index.js", true), null);
		assert.strictEqual(explainSubpathsInConditions(null, true), null);
	});
});
