"use strict";

/* eslint-disable jsdoc/reject-any-type */

const DescriptionFileUtils = require("../lib/DescriptionFileUtils");

/** @type {any} */
const stubResolver = {
	join: (a, b) => `${a}/${b}`,
};

describe("DescriptionFileUtils", () => {
	describe("cdUp", () => {
		it("returns null for root '/'", () => {
			expect(DescriptionFileUtils.cdUp("/")).toBeNull();
		});

		it("returns parent directory for posix paths", () => {
			expect(DescriptionFileUtils.cdUp("/a/b/c")).toBe("/a/b");
		});

		it("returns parent directory for windows paths", () => {
			expect(DescriptionFileUtils.cdUp("C:\\a\\b\\c")).toBe("C:\\a\\b");
		});

		it("returns null when there are no separators", () => {
			// cspell:ignore noslash
			expect(DescriptionFileUtils.cdUp("noslash")).toBeNull();
		});

		it("returns '/' when stripping the only directory", () => {
			expect(DescriptionFileUtils.cdUp("/foo")).toBe("/");
		});
	});

	describe("getField", () => {
		it("returns undefined for empty content", () => {
			expect(
				DescriptionFileUtils.getField(/** @type {any} */ (null), "x"),
			).toBeUndefined();
		});

		it("walks an array field path", () => {
			const data = { a: { b: { c: 42 } } };
			expect(
				DescriptionFileUtils.getField(/** @type {any} */ (data), [
					"a",
					"b",
					"c",
				]),
			).toBe(42);
		});

		it("returns the deep value or null when path is broken mid-traversal", () => {
			const data = { a: 1 };
			expect(
				DescriptionFileUtils.getField(/** @type {any} */ (data), ["a", "b"]),
			).toBeNull();
		});

		it("returns the field value for a string field", () => {
			expect(
				DescriptionFileUtils.getField(
					/** @type {any} */ ({ name: "x" }),
					"name",
				),
			).toBe("x");
		});
	});

	describe("loadDescriptionFile fallback (no readJson)", () => {
		it("returns 'No content in file' when content is empty", (done) => {
			const fileSystem = {
				readFile(_p, cb) {
					cb(null, /** @type {any} */ (null));
				},
			};
			const resolver = /** @type {any} */ ({
				...stubResolver,
				fileSystem,
			});
			const log = [];
			DescriptionFileUtils.loadDescriptionFile(
				resolver,
				"/dir",
				["package.json"],
				undefined,
				{ log: (m) => log.push(m) },
				(err) => {
					expect(err).toBeTruthy();
					expect(/** @type {any} */ (err).message).toMatch(
						/No content in file/,
					);
					done();
				},
			);
		});

		it("propagates JSON parse errors", (done) => {
			const fileSystem = {
				readFile(_p, cb) {
					cb(null, Buffer.from("{ this is not JSON"));
				},
			};
			const resolver = /** @type {any} */ ({
				...stubResolver,
				fileSystem,
			});
			DescriptionFileUtils.loadDescriptionFile(
				resolver,
				"/dir",
				["package.json"],
				undefined,
				{},
				(err) => {
					expect(err).toBeTruthy();
					done();
				},
			);
		});

		it("falls through quietly when readFile errors (file not found)", (done) => {
			const missing = new Set();
			const fileSystem = {
				readFile(_p, cb) {
					const err = /** @type {any} */ (new Error("ENOENT"));
					err.code = "ENOENT";
					cb(err);
				},
			};
			const resolver = /** @type {any} */ ({
				...stubResolver,
				fileSystem,
			});
			DescriptionFileUtils.loadDescriptionFile(
				resolver,
				"/dir",
				["package.json"],
				undefined,
				{ missingDependencies: missing },
				(err, result) => {
					expect(err).toBeFalsy();
					expect(result).toBeUndefined();
					expect(missing.has("/dir/package.json")).toBe(true);
					done();
				},
			);
		});

		it("parses JSON content successfully and tracks file dependency", (done) => {
			const fileDeps = new Set();
			const fileSystem = {
				readFile(_p, cb) {
					cb(null, Buffer.from('{"name":"ok"}'));
				},
			};
			const resolver = /** @type {any} */ ({
				...stubResolver,
				fileSystem,
			});
			DescriptionFileUtils.loadDescriptionFile(
				resolver,
				"/dir",
				["package.json"],
				undefined,
				{ fileDependencies: fileDeps },
				(err, result) => {
					expect(err).toBeFalsy();
					expect(result).toBeTruthy();
					expect(/** @type {any} */ (result).content).toEqual({ name: "ok" });
					expect(fileDeps.has("/dir/package.json")).toBe(true);
					done();
				},
			);
		});

		it("re-uses oldInfo when directory matches", (done) => {
			const fileSystem = {
				readFile() {
					throw new Error("should not be called");
				},
			};
			const resolver = /** @type {any} */ ({
				...stubResolver,
				fileSystem,
			});
			const oldInfo = /** @type {any} */ ({
				directory: "/cached",
				path: "/cached/package.json",
				content: { name: "cached" },
			});
			DescriptionFileUtils.loadDescriptionFile(
				resolver,
				"/cached",
				["package.json"],
				oldInfo,
				{},
				(err, result) => {
					expect(err).toBeFalsy();
					expect(result).toBe(oldInfo);
					done();
				},
			);
		});
	});

	describe("loadDescriptionFile (with readJson)", () => {
		it("uses fs.readJson when present and tracks fileDependencies", (done) => {
			const fileDeps = new Set();
			const fileSystem = {
				readJson(_p, cb) {
					cb(null, { name: "rj" });
				},
			};
			const resolver = /** @type {any} */ ({
				...stubResolver,
				fileSystem,
			});
			DescriptionFileUtils.loadDescriptionFile(
				resolver,
				"/r",
				["package.json"],
				undefined,
				{ fileDependencies: fileDeps },
				(err, result) => {
					expect(err).toBeFalsy();
					expect(/** @type {any} */ (result).content).toEqual({ name: "rj" });
					expect(fileDeps.has("/r/package.json")).toBe(true);
					done();
				},
			);
		});

		it("treats errors with code as missing-dependency (skip)", (done) => {
			const missing = new Set();
			const fileSystem = {
				readJson(_p, cb) {
					const err = /** @type {any} */ (new Error("ENOENT"));
					err.code = "ENOENT";
					cb(err);
				},
			};
			const resolver = /** @type {any} */ ({
				...stubResolver,
				fileSystem,
			});
			DescriptionFileUtils.loadDescriptionFile(
				resolver,
				"/r",
				["package.json"],
				undefined,
				{ missingDependencies: missing },
				(err, result) => {
					expect(err).toBeFalsy();
					expect(result).toBeUndefined();
					expect(missing.has("/r/package.json")).toBe(true);
					done();
				},
			);
		});

		it("propagates errors without code via onJson", (done) => {
			const fileSystem = {
				readJson(_p, cb) {
					cb(new Error("parse-fail"));
				},
			};
			const resolver = /** @type {any} */ ({
				...stubResolver,
				fileSystem,
			});
			DescriptionFileUtils.loadDescriptionFile(
				resolver,
				"/r",
				["package.json"],
				undefined,
				{},
				(err) => {
					expect(err).toBeTruthy();
					expect(/** @type {any} */ (err).message).toMatch(/parse-fail/);
					done();
				},
			);
		});
	});

	describe("loadDescriptionFile traversal", () => {
		it("walks up directories until cdUp returns null", (done) => {
			let calls = 0;
			const fileSystem = {
				readFile(_p, cb) {
					calls++;
					const err = /** @type {any} */ (new Error("ENOENT"));
					err.code = "ENOENT";
					cb(err);
				},
			};
			const resolver = /** @type {any} */ ({
				...stubResolver,
				fileSystem,
			});
			DescriptionFileUtils.loadDescriptionFile(
				resolver,
				"/a/b/c",
				["package.json"],
				undefined,
				{},
				(err, result) => {
					expect(err).toBeFalsy();
					expect(result).toBeUndefined();
					// Tried package.json in /a/b/c, /a/b, /a, /  → 4 calls
					expect(calls).toBeGreaterThanOrEqual(2);
					done();
				},
			);
		});
	});
});
