"use strict";

/* eslint-disable jsdoc/reject-any-type */

// readJson is a utility used internally by TsconfigPathsPlugin to load JSONC
// files (tsconfig.json with comments). Because that plugin always passes
// stripComments:true, the `readJson`-fast path and other options in this
// utility have no integration callers — they are tested here directly
// (matching the style of test/identifier.test.js, test/getPaths.test.js
// and test/forEachBail.test.js).
//
// The API is callback-based (rather than Promise-based) so that synchronous
// file systems remain synchronous all the way through `TsconfigPathsPlugin`,
// which is what makes `resolveSync` work when `tsconfig` is enabled (see
// issue #571).
const { readJson } = require("../lib/util/fs");

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
		expect(result).toEqual(content);
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
		await expect(
			readJsonPromise(fileSystem, "/a/package.json"),
		).rejects.toThrow("boom");
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
		expect(result).toEqual({ a: 1, b: [1, 2] });
	});

	it("falls back to readFile when readJson is unavailable", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(null, Buffer.from('{"hello": "world"}'));
			},
		});
		const result = await readJsonPromise(fileSystem, "/a/package.json");
		expect(result).toEqual({ hello: "world" });
	});

	it("rejects when readFile errors", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_p, callback) {
				callback(new Error("read-fail"));
			},
		});
		await expect(
			readJsonPromise(fileSystem, "/a/package.json"),
		).rejects.toThrow("read-fail");
	});

	it("invokes the callback synchronously when the file system is synchronous (issue #571)", () => {
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
		expect(sync).toBe(true);
		expect(result).toEqual({ sync: true });
	});
});
