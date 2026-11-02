"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const SyncAsyncFileSystemDecorator = require("../lib/SyncAsyncFileSystemDecorator");
const { after, before, describe, it } = require("./_runner");

/** @typedef {import("../lib/Resolver").SyncFileSystem} SyncFileSystem */

const fixtures = path.join(__dirname, "fixtures");
const file = path.join(fixtures, "abc.txt");
const missing = path.join(fixtures, "does-not-exist");
const content = fs.readFileSync(file);
const text = content.toString("utf8");

/**
 * @param {NodeJS.ErrnoException | Error | null} err error
 * @param {string} code expected code
 */
const assertCode = (err, code) => {
	assert.ok(err, `expected ${code}`);
	assert.strictEqual(/** @type {NodeJS.ErrnoException} */ (err).code, code);
};

describe("SyncAsyncFileSystemDecorator", () => {
	const decorated = new SyncAsyncFileSystemDecorator(fs);

	describe("stat", () => {
		it("should stat synchronously", () => {
			assert.ok(decorated.statSync(file).isFile());
			assert.strictEqual(
				typeof decorated.statSync(file, { bigint: true }).size,
				"bigint",
			);
			// A `bigint` known only as a boolean still yields defined stats.
			const bigint = /** @type {boolean} */ (process.env.NEVER_SET === "1");
			assert.ok(decorated.statSync(file, { bigint }).isFile());
		});

		it("should stat through a callback with and without options", (t, done) => {
			decorated.stat(file, (err, stats) => {
				if (err) return done(err);
				assert.ok(/** @type {fs.Stats} */ (stats).isFile());
				decorated.stat(file, { bigint: true }, (err, bigStats) => {
					if (err) return done(err);
					assert.strictEqual(
						typeof (/** @type {fs.BigIntStats} */ (bigStats).size),
						"bigint",
					);
					done();
				});
			});
		});

		it("should pass errors to the callback", (t, done) => {
			decorated.stat(missing, (err) => {
				assertCode(err, "ENOENT");
				done();
			});
		});
	});

	describe("lstat", () => {
		it("should lstat synchronously and through a callback", (t, done) => {
			const { lstat, lstatSync } = decorated;
			if (!lstat || !lstatSync) return done(new Error("lstat expected"));
			assert.ok(lstatSync(file).isFile());
			assert.strictEqual(
				typeof lstatSync(file, { bigint: true }).size,
				"bigint",
			);
			lstat(file, (err, stats) => {
				if (err) return done(err);
				assert.ok(/** @type {fs.Stats} */ (stats).isFile());
				lstat(file, { bigint: true }, (err, bigStats) => {
					if (err) return done(err);
					assert.strictEqual(
						typeof (/** @type {fs.BigIntStats} */ (bigStats).size),
						"bigint",
					);
					lstat(missing, (err) => {
						assertCode(err, "ENOENT");
						done();
					});
				});
			});
		});
	});

	describe("readdir", () => {
		it("should read a directory synchronously", () => {
			assert.ok(decorated.readdirSync(fixtures).includes("abc.txt"));
			assert.ok(
				decorated
					.readdirSync(fixtures, { encoding: "utf8" })
					.includes("abc.txt"),
			);
		});

		it("should read a directory through a callback", (t, done) => {
			decorated.readdir(fixtures, (err, entries) => {
				if (err) return done(err);
				assert.ok(/** @type {string[]} */ (entries).includes("abc.txt"));
				decorated.readdir(fixtures, { encoding: "utf8" }, (err, encoded) => {
					if (err) return done(err);
					assert.ok(/** @type {string[]} */ (encoded).includes("abc.txt"));
					decorated.readdir(missing, (err, empty) => {
						assertCode(err, "ENOENT");
						assert.deepStrictEqual(empty, []);
						done();
					});
				});
			});
		});
	});

	describe("readFile", () => {
		it("should read a buffer without options", () => {
			assert.deepStrictEqual(decorated.readFileSync(file), content);
		});

		it("should read a buffer with null options", () => {
			assert.deepStrictEqual(decorated.readFileSync(file, null), content);
		});

		it("should read a string with an encoding", () => {
			assert.strictEqual(decorated.readFileSync(file, "utf8"), text);
		});

		it("should read a string with an options object", () => {
			assert.strictEqual(
				decorated.readFileSync(file, { encoding: "utf8" }),
				text,
			);
		});

		it("should pass each kind of options through a callback", (t, done) => {
			decorated.readFile(file, "utf8", (err, encoded) => {
				if (err) return done(err);
				assert.strictEqual(encoded, text);
				decorated.readFile(file, { encoding: "utf8" }, (err, fromObject) => {
					if (err) return done(err);
					assert.strictEqual(fromObject, text);
					decorated.readFile(file, null, (err, raw) => {
						if (err) return done(err);
						assert.deepStrictEqual(raw, content);
						decorated.readFile(file, (err, noOptions) => {
							if (err) return done(err);
							assert.deepStrictEqual(noOptions, content);
							decorated.readFile(missing, (err) => {
								assertCode(err, "ENOENT");
								done();
							});
						});
					});
				});
			});
		});
	});

	describe("readlink", () => {
		const tempDir = path.join(os.tmpdir(), "enhanced-resolve-sync-async-");
		/** @type {string | undefined} */
		let dir;
		/** @type {string | undefined} */
		let link;

		before(() => {
			dir = fs.mkdtempSync(tempDir);
			try {
				fs.symlinkSync(file, path.join(dir, "link"), "file");
				link = path.join(dir, "link");
			} catch (_err) {
				// Creating symlinks needs extra rights on Windows.
			}
		});

		after(() => {
			if (dir) fs.rmSync(dir, { recursive: true, force: true });
		});

		it("should read a link synchronously and through a callback", (t, done) => {
			if (!link) return done();
			const target = link;
			assert.strictEqual(decorated.readlinkSync(target), file);
			assert.strictEqual(
				decorated.readlinkSync(target, { encoding: "utf8" }),
				file,
			);
			decorated.readlink(target, (err, result) => {
				if (err) return done(err);
				assert.strictEqual(result, file);
				decorated.readlink(target, { encoding: "utf8" }, (err, encoded) => {
					if (err) return done(err);
					assert.strictEqual(encoded, file);
					done();
				});
			});
		});

		it("should pass errors to the callback", (t, done) => {
			decorated.readlink(missing, (err) => {
				assertCode(err, "ENOENT");
				done();
			});
		});
	});

	describe("realpath", () => {
		it("should resolve a real path synchronously and through a callback", (t, done) => {
			const { realpath, realpathSync } = decorated;
			if (!realpath || !realpathSync) {
				return done(new Error("realpath expected"));
			}
			const expected = fs.realpathSync(file);
			assert.strictEqual(realpathSync(file), expected);
			assert.strictEqual(realpathSync(file, { encoding: "utf8" }), expected);
			realpath(file, (err, result) => {
				if (err) return done(err);
				assert.strictEqual(result, expected);
				realpath(file, { encoding: "utf8" }, (err, encoded) => {
					if (err) return done(err);
					assert.strictEqual(encoded, expected);
					realpath(missing, (err) => {
						assertCode(err, "ENOENT");
						done();
					});
				});
			});
		});
	});

	describe("readJson", () => {
		it("should not expose readJson when the file system has no readJsonSync", () => {
			assert.strictEqual(decorated.readJson, undefined);
			assert.strictEqual(decorated.readJsonSync, undefined);
		});

		it("should read JSON synchronously and through a callback", (t, done) => {
			const json = path.join(fixtures, "browser-module", "package.json");
			/** @type {SyncFileSystem} */
			const withJson = {
				statSync: fs.statSync,
				readdirSync: fs.readdirSync,
				readFileSync: fs.readFileSync,
				readlinkSync: fs.readlinkSync,
				readJsonSync: (arg) =>
					JSON.parse(fs.readFileSync(arg, "utf8").toString()),
			};
			const { readJson, readJsonSync } = new SyncAsyncFileSystemDecorator(
				withJson,
			);
			if (!readJson || !readJsonSync) {
				return done(new Error("readJson expected"));
			}
			const expected = JSON.parse(fs.readFileSync(json, "utf8"));
			assert.deepStrictEqual(readJsonSync(json), expected);
			readJson(json, (err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(result, expected);
				readJson(missing, (err) => {
					assertCode(err, "ENOENT");
					done();
				});
			});
		});
	});

	describe("optional methods", () => {
		it("should leave out lstat, realpath and readJson the file system lacks", () => {
			const minimal = new SyncAsyncFileSystemDecorator({
				statSync: fs.statSync,
				readdirSync: fs.readdirSync,
				readFileSync: fs.readFileSync,
				readlinkSync: fs.readlinkSync,
			});
			assert.strictEqual(minimal.lstat, undefined);
			assert.strictEqual(minimal.lstatSync, undefined);
			assert.strictEqual(minimal.realpath, undefined);
			assert.strictEqual(minimal.realpathSync, undefined);
			assert.strictEqual(minimal.readJson, undefined);
			assert.strictEqual(minimal.readJsonSync, undefined);
			assert.ok(minimal.statSync(file).isFile());
		});
	});
});
