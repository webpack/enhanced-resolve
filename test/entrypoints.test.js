"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");

const {
	processExportsField,
	processImportsField,
} = require("../lib/util/entrypoints");

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
