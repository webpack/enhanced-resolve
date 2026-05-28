"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");

/* eslint-disable jsdoc/reject-any-type */

// `readJson` is the JSONC loader used internally by TsconfigPathsPlugin.
// The plugin always passes stripComments:true, so the readJson-fast path
// and other branches have no integration callers and are tested directly.
const { decodeText, readJson } = require("../lib/util/fs");

/**
 * @param {any} fileSystem file system
 * @param {string} jsonFilePath path
 * @param {{ stripComments?: boolean }=} options options
 * @returns {Promise<any>} parsed JSON
 */
function readJsonPromise(fileSystem, jsonFilePath, options = {}) {
	return new Promise((resolve, reject) => {
		readJson(fileSystem, jsonFilePath, options, (err, content) => {
			if (err) return reject(err);
			resolve(content);
		});
	});
}

describe("util/fs readJson", () => {
	it("uses fileSystem.readJson when available and stripComments is false", async () => {
		const content = { name: "fast-path" };
		const fileSystem = /** @type {any} */ ({
			readJson(_p, callback) {
				callback(null, content);
			},
			readFile(_p, callback) {
				callback(new Error("should not be called"));
			},
		});
		const result = await readJsonPromise(fileSystem, "/a/package.json");
		assert.deepStrictEqual(result, content);
	});

	it("rejects if readJson yields an error", async () => {
		const fileSystem = /** @type {any} */ ({
			readJson(_p, callback) {
				callback(new Error("boom"));
			},
			readFile(_p, callback) {
				callback(null, Buffer.from("{}"));
			},
		});
		await assert.rejects(
			readJsonPromise(fileSystem, "/a/package.json"),
			(err) => err instanceof Error && err.message.includes("boom"),
		);
	});

	it("falls back to readFile when stripComments is true", async () => {
		const fileSystem = /** @type {any} */ ({
			readJson(_p, callback) {
				callback(new Error("should not be called"));
			},
			readFile(_p, callback) {
				callback(
					null,
					Buffer.from('{\n// comment\n"a": 1, /*x*/ "b": [1,2,],\n}'),
				);
			},
		});
		const result = await readJsonPromise(fileSystem, "/a/tsconfig.json", {
			stripComments: true,
		});
		assert.deepStrictEqual(result, { a: 1, b: [1, 2] });
	});

	it("falls back to readFile when readJson is unavailable", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(null, Buffer.from('{"hello": "world"}'));
			},
		});
		const result = await readJsonPromise(fileSystem, "/a/package.json");
		assert.deepStrictEqual(result, { hello: "world" });
	});

	it("decodes a Uint8Array (non-Node file system) result", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(null, new TextEncoder().encode('{"hello": "world"}'));
			},
		});
		const result = await readJsonPromise(fileSystem, "/a/package.json");
		expect(result).toEqual({ hello: "world" });
	});

	it("decodes a Uint8Array result when stripping comments", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(
					null,
					new TextEncoder().encode(
						'{\n// comment\n"a": 1, /*x*/ "b": [1,2,],\n}',
					),
				);
			},
		});
		const result = await readJsonPromise(fileSystem, "/a/tsconfig.json", {
			stripComments: true,
		});
		expect(result).toEqual({ a: 1, b: [1, 2] });
	});

	it("rejects when readFile errors", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(new Error("read-fail"));
			},
		});
		await assert.rejects(
			readJsonPromise(fileSystem, "/a/package.json"),
			(err) => err instanceof Error && err.message.includes("read-fail"),
		);
	});

	it("invokes the callback synchronously when the file system is synchronous", () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(null, Buffer.from('{"sync": true}'));
			},
		});
		let sync = false;
		let result;
		readJson(
			fileSystem,
			"/a/tsconfig.json",
			{ stripComments: true },
			(err, content) => {
				if (err) throw err;
				result = content;
				sync = true;
			},
		);
		assert.strictEqual(sync, true);
		assert.deepStrictEqual(result, { sync: true });
	});

	// Regression: a file system may return a string from readFile (more likely
	// off Node). The strip-comments cache is a WeakMap, so a string key must not
	// be used — previously this threw "Invalid value used as weak map key".
	it("parses string content with stripComments without throwing", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(null, '{\n// c\n"a": 1, /* x */ "b": [1, 2,],\n}');
			},
		});
		const result = await readJsonPromise(fileSystem, "/a/tsconfig.json", {
			stripComments: true,
		});
		expect(result).toEqual({ a: 1, b: [1, 2] });
	});

	it("parses string content without stripComments", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(null, '{"hello": "world"}');
			},
		});
		const result = await readJsonPromise(fileSystem, "/a/package.json");
		expect(result).toEqual({ hello: "world" });
	});

	it("serves repeated stripComments reads of the same buffer from cache", async () => {
		const buf = new TextEncoder().encode('{ /* c */ "cached": true, }');
		let reads = 0;
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				reads++;
				callback(null, buf);
			},
		});
		const a = await readJsonPromise(fileSystem, "/a/tsconfig.json", {
			stripComments: true,
		});
		const b = await readJsonPromise(fileSystem, "/a/tsconfig.json", {
			stripComments: true,
		});
		expect(a).toEqual({ cached: true });
		expect(b).toBe(a); // same cached object instance for the same buffer
		expect(reads).toBe(2);
	});
});

describe("util/fs decodeText", () => {
	it("returns a string unchanged", () => {
		expect(decodeText("日本語")).toBe("日本語");
	});

	it("decodes a Node Buffer as utf-8", () => {
		expect(decodeText(Buffer.from("日本語", "utf8"))).toBe("日本語");
	});

	it("decodes a Uint8Array as utf-8", () => {
		expect(decodeText(new TextEncoder().encode("日本語"))).toBe("日本語");
	});

	it("decodes an empty Uint8Array to an empty string", () => {
		expect(decodeText(new Uint8Array(0))).toBe("");
	});

	it("decodes multi-byte characters across the buffer", () => {
		const text = "中文 — emoji 😀 — π";
		expect(decodeText(new TextEncoder().encode(text))).toBe(text);
	});

	it("keeps a leading BOM identically for Buffer and Uint8Array", () => {
		const text = `${"\uFEFF"}{"a":1}`;
		const fromBuffer = decodeText(Buffer.from(text, "utf8"));
		const fromU8 = decodeText(new TextEncoder().encode(text));
		// Both keep the BOM (matching Buffer.toString), so the two paths agree.
		expect(fromBuffer).toBe(text);
		expect(fromU8).toBe(fromBuffer);
	});
});
