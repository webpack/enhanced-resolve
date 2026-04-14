"use strict";

/* eslint-disable jsdoc/reject-any-type */

const { CachedInputFileSystem } = require("../");

/**
 * @param {number} duration cache duration ms
 * @param {object=} overrides backing fs overrides
 * @returns {import("../").CachedInputFileSystem} cached fs with an in-memory backing fs
 */
function buildFs(duration, overrides = {}) {
	const base = {
		stat(_p, ...rest) {
			const cb = typeof rest[0] === "function" ? rest[0] : rest[1];
			cb(null, { ok: true });
		},
		statSync: () => ({ ok: true }),
		readFile(_p, cb) {
			cb(null, Buffer.from(""));
		},
		readFileSync: () => Buffer.from(""),
		readdir(_p, cb) {
			cb(null, []);
		},
		readdirSync: () => [],
		readlink(_p, cb) {
			cb(new Error("EINVAL"));
		},
		readlinkSync: () => {
			throw new Error("EINVAL");
		},
		lstat(_p, cb) {
			cb(null, { ok: true });
		},
		lstatSync: () => ({ ok: true }),
		...overrides,
	};
	return new CachedInputFileSystem(/** @type {any} */ (base), duration);
}

describe("CachedInputFileSystem coverage gaps", () => {
	describe("OperationMergerBackend (duration=0)", () => {
		it("rejects non-string / non-Buffer / non-URL / non-number paths with TypeError", (done) => {
			const fs = buildFs(0);
			fs.stat(/** @type {any} */ ({ not: "a path" }), (err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).message).toMatch(
					/path must be a string/,
				);
				done();
			});
		});

		it("accepts Buffer paths", (done) => {
			const fs = buildFs(0);
			fs.stat(/** @type {any} */ (Buffer.from("/x")), (err, result) => {
				expect(err).toBeFalsy();
				expect(result).toEqual({ ok: true });
				done();
			});
		});

		it("forwards options through to the provider", (done) => {
			let sawOptions;
			const fs = buildFs(0, {
				stat(p, options, cb) {
					sawOptions = options;
					cb(null, { ok: true });
				},
			});
			fs.stat("/x", { bigint: false }, (err) => {
				expect(err).toBeFalsy();
				expect(sawOptions).toEqual({ bigint: false });
				done();
			});
		});

		it("merges concurrent async operations against the same path", (done) => {
			let calls = 0;
			const fs = buildFs(0, {
				stat(p, cb) {
					calls++;
					setTimeout(() => cb(null, { p }), 5);
				},
			});
			let completed = 0;
			const check = () => {
				completed++;
				if (completed === 2) {
					expect(calls).toBe(1);
					done();
				}
			};
			fs.stat("/merged", check);
			fs.stat("/merged", check);
		});
	});

	describe("CacheBackend (duration>0)", () => {
		it("rejects non-path arguments from the async API", (done) => {
			const fs = buildFs(1000);
			fs.stat(/** @type {any} */ (true), (err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).message).toMatch(
					/path must be a string/,
				);
				done();
			});
		});

		it("rejects non-path arguments from the sync API", () => {
			const fs = buildFs(1000);
			expect(() => fs.statSync(/** @type {any} */ ({}))).toThrow(
				/path must be a string/,
			);
		});
	});

	describe("readJson fallback", () => {
		it("errors with 'No file content' when the file is empty", (done) => {
			const fs = buildFs(0, {
				readFile(_p, cb) {
					cb(null, Buffer.alloc(0));
				},
			});
			fs.readJson("/empty.json", (err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).message).toMatch(/No file content/);
				done();
			});
		});

		it("propagates JSON parse errors", (done) => {
			const fs = buildFs(0, {
				readFile(_p, cb) {
					cb(null, Buffer.from("{not json"));
				},
			});
			fs.readJson("/bad.json", (err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err)).toBeInstanceOf(SyntaxError);
				done();
			});
		});

		it("propagates the underlying readFile error", (done) => {
			const fs = buildFs(0, {
				readFile(_p, cb) {
					cb(new Error("read-fail"));
				},
			});
			fs.readJson("/broken.json", (err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).message).toBe("read-fail");
				done();
			});
		});

		it("returns parsed JSON when the content is valid", (done) => {
			const fs = buildFs(0, {
				readFile(_p, cb) {
					cb(null, Buffer.from('{"hello":"world"}'));
				},
			});
			fs.readJson("/ok.json", (err, result) => {
				expect(err).toBeFalsy();
				expect(result).toEqual({ hello: "world" });
				done();
			});
		});
	});
});
