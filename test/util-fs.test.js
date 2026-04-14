"use strict";

/* eslint-disable jsdoc/reject-any-type */

const { readJson } = require("../lib/util/fs");

describe("util/fs readJson", () => {
	it("uses fileSystem.readJson when available and stripComments is false", async () => {
		const content = { name: "fast-path" };
		const fileSystem = /** @type {any} */ ({
			readJson(_path, callback) {
				callback(null, content);
			},
			readFile(_path, callback) {
				callback(new Error("should not be called"));
			},
		});
		const result = await readJson(fileSystem, "/a/package.json");
		expect(result).toEqual(content);
	});

	it("rejects if readJson yields an error", async () => {
		const fileSystem = /** @type {any} */ ({
			readJson(_path, callback) {
				callback(new Error("boom"));
			},
			readFile(_path, callback) {
				callback(null, Buffer.from("{}"));
			},
		});
		await expect(readJson(fileSystem, "/a/package.json")).rejects.toThrow(
			"boom",
		);
	});

	it("falls back to readFile when stripComments is true", async () => {
		const fileSystem = /** @type {any} */ ({
			readJson(_path, callback) {
				callback(new Error("should not be called"));
			},
			readFile(_path, callback) {
				callback(
					null,
					Buffer.from('{\n// comment\n"a": 1, /*x*/ "b": [1,2,],\n}'),
				);
			},
		});
		const result = await readJson(fileSystem, "/a/tsconfig.json", {
			stripComments: true,
		});
		expect(result).toEqual({ a: 1, b: [1, 2] });
	});

	it("falls back to readFile when readJson is unavailable", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_path, callback) {
				callback(null, Buffer.from('{"hello": "world"}'));
			},
		});
		const result = await readJson(fileSystem, "/a/package.json");
		expect(result).toEqual({ hello: "world" });
	});

	it("rejects when readFile errors", async () => {
		const fileSystem = /** @type {any} */ ({
			readFile(_path, callback) {
				callback(new Error("read-fail"));
			},
		});
		await expect(readJson(fileSystem, "/a/package.json")).rejects.toThrow(
			"read-fail",
		);
	});
});
