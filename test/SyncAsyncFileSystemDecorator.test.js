"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const SyncAsyncFileSystemDecorator = require("../lib/SyncAsyncFileSystemDecorator");

const existing = path.join(__dirname, "fixtures", "decorated-fs", "exists.js");
const missing = path.join(
	__dirname,
	"fixtures",
	"decorated-fs",
	"does-not-exist.js",
);

describe("syncAsyncFileSystemDecorator stat", () => {
	it("should use options when they're provided", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.stat(
			path.join(__dirname, "fixtures", "decorated-fs", "exists.js"),
			{ bigint: true },
			(error, result) => {
				expect(error).toBeNull();
				expect(result).toHaveProperty("size");
				expect(result).toHaveProperty("birthtime");
				expect(
					typeof (/** @type {import("fs").BigIntStats} */ (result).size),
				).toBe("bigint");
				done();
			},
		);
	});

	it("should work correctly when no options provided", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.stat(
			path.join(__dirname, "fixtures", "decorated-fs", "exists.js"),
			(error, result) => {
				expect(error).toBeNull();
				expect(result).toHaveProperty("size");
				expect(result).toHaveProperty("birthtime");
				expect(typeof (/** @type {import("fs").Stats} */ (result).size)).toBe(
					"number",
				);
				done();
			},
		);
	});
});

describe("syncAsyncFileSystemDecorator lstat", () => {
	it("should use options when they're provided", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		if (decoratedFs.lstat) {
			decoratedFs.lstat(
				path.join(__dirname, "fixtures", "decorated-fs", "exists.js"),
				{ bigint: true },
				(error, result) => {
					expect(error).toBeNull();
					expect(result).toHaveProperty("size");
					expect(result).toHaveProperty("birthtime");
					expect(
						typeof (/** @type {import("fs").BigIntStats} */ (result).size),
					).toBe("bigint");
					done();
				},
			);
		}
	});

	it("should work correctly when no options provided", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		if (decoratedFs.lstat) {
			decoratedFs.lstat(
				path.join(__dirname, "fixtures", "decorated-fs", "exists.js"),
				(error, result) => {
					expect(error).toBeNull();
					expect(result).toHaveProperty("size");
					expect(result).toHaveProperty("birthtime");
					expect(typeof (/** @type {import("fs").Stats} */ (result).size)).toBe(
						"number",
					);
					done();
				},
			);
		}
	});

	it("should forward lstat errors to the callback", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		if (!decoratedFs.lstat) return done();
		decoratedFs.lstat(missing, (error, result) => {
			expect(error).toBeTruthy();
			expect(error.code).toBe("ENOENT");
			expect(result).toBeUndefined();
			done();
		});
	});

	it("should expose lstatSync that accepts options", () => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		if (!decoratedFs.lstatSync) return;
		const stats = decoratedFs.lstatSync(existing);
		expect(stats).toHaveProperty("size");
	});

	it("should not expose lstat when the backing fs has no lstatSync", () => {
		const fsMock = {
			statSync: () => ({}),
			readdirSync: () => [],
			readFileSync: () => Buffer.from(""),
			readlinkSync: () => "",
		};
		const decoratedFs = new SyncAsyncFileSystemDecorator(
			/** @type {any} */ (fsMock),
		);
		expect(decoratedFs.lstat).toBeUndefined();
		expect(decoratedFs.lstatSync).toBeUndefined();
	});
});

describe("syncAsyncFileSystemDecorator stat errors and sync", () => {
	it("should forward stat errors to the callback", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.stat(missing, (error, result) => {
			expect(error).toBeTruthy();
			expect(error.code).toBe("ENOENT");
			expect(result).toBeUndefined();
			done();
		});
	});

	it("should expose statSync", () => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		const stats = decoratedFs.statSync(existing);
		expect(stats).toHaveProperty("size");
	});
});

describe("syncAsyncFileSystemDecorator readdir", () => {
	const dir = path.join(__dirname, "fixtures", "decorated-fs");

	it("should read a directory without options", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.readdir(dir, (error, result) => {
			expect(error).toBeNull();
			expect(Array.isArray(result)).toBe(true);
			expect(result).toContain("exists.js");
			done();
		});
	});

	it("should read a directory with options", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.readdir(dir, { withFileTypes: false }, (error, result) => {
			expect(error).toBeNull();
			expect(Array.isArray(result)).toBe(true);
			done();
		});
	});

	it("should forward readdir errors and return empty array", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.readdir(missing, (error, result) => {
			expect(error).toBeTruthy();
			expect(error.code).toBe("ENOENT");
			expect(result).toEqual([]);
			done();
		});
	});

	it("should expose readdirSync", () => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		const result = decoratedFs.readdirSync(dir);
		expect(result).toContain("exists.js");
	});
});

describe("syncAsyncFileSystemDecorator readFile", () => {
	it("should read a file without options", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.readFile(existing, (error, result) => {
			expect(error).toBeNull();
			expect(result).toBeDefined();
			done();
		});
	});

	it("should read a file with options", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.readFile(existing, "utf8", (error, result) => {
			expect(error).toBeNull();
			expect(typeof result).toBe("string");
			done();
		});
	});

	it("should forward readFile errors to the callback", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.readFile(missing, (error, result) => {
			expect(error).toBeTruthy();
			expect(error.code).toBe("ENOENT");
			expect(result).toBeUndefined();
			done();
		});
	});

	it("should expose readFileSync", () => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		const contents = decoratedFs.readFileSync(existing);
		expect(contents).toBeDefined();
	});
});

describe("syncAsyncFileSystemDecorator readlink", () => {
	it("should forward readlink errors (non-symlink target)", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.readlink(existing, (error, result) => {
			expect(error).toBeTruthy();
			expect(result).toBeUndefined();
			done();
		});
	});

	it("should forward readlink errors with options", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.readlink(existing, { encoding: "utf8" }, (error, result) => {
			expect(error).toBeTruthy();
			expect(result).toBeUndefined();
			done();
		});
	});

	it("should expose readlinkSync", () => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		expect(() => decoratedFs.readlinkSync(existing)).toThrow(/EINVAL|ENOENT/);
	});
});

describe("syncAsyncFileSystemDecorator readJson", () => {
	it("should be absent when the backing fs has no readJsonSync", () => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		expect(decoratedFs.readJson).toBeUndefined();
		expect(decoratedFs.readJsonSync).toBeUndefined();
	});

	it("should forward readJson success through the callback", (done) => {
		const fsMock = {
			statSync: () => ({}),
			readdirSync: () => [],
			readFileSync: () => Buffer.from(""),
			readlinkSync: () => "",
			readJsonSync: () => ({ name: "ok" }),
		};
		const decoratedFs = new SyncAsyncFileSystemDecorator(
			/** @type {any} */ (fsMock),
		);
		decoratedFs.readJson("/x.json", (err, value) => {
			expect(err).toBeNull();
			expect(value).toEqual({ name: "ok" });
			done();
		});
	});

	it("should forward readJson errors through the callback", (done) => {
		const err = new Error("nope");
		const fsMock = {
			statSync: () => ({}),
			readdirSync: () => [],
			readFileSync: () => Buffer.from(""),
			readlinkSync: () => "",
			readJsonSync: () => {
				throw err;
			},
		};
		const decoratedFs = new SyncAsyncFileSystemDecorator(
			/** @type {any} */ (fsMock),
		);
		decoratedFs.readJson("/x.json", (error, value) => {
			expect(error).toBe(err);
			expect(value).toBeUndefined();
			done();
		});
	});

	it("should expose readJsonSync when the backing fs provides it", () => {
		const fsMock = {
			statSync: () => ({}),
			readdirSync: () => [],
			readFileSync: () => Buffer.from(""),
			readlinkSync: () => "",
			readJsonSync: () => ({ ok: true }),
		};
		const decoratedFs = new SyncAsyncFileSystemDecorator(
			/** @type {any} */ (fsMock),
		);
		expect(decoratedFs.readJsonSync("/x.json")).toEqual({ ok: true });
	});
});

describe("syncAsyncFileSystemDecorator realpath", () => {
	it("should expose realpath when the backing fs has realpathSync", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		if (!decoratedFs.realpath) return done();
		decoratedFs.realpath(existing, (error, result) => {
			expect(error).toBeNull();
			expect(typeof result).toBe("string");
			done();
		});
	});

	it("should accept options when realpath is async", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		if (!decoratedFs.realpath) return done();
		decoratedFs.realpath(existing, { encoding: "utf8" }, (error, result) => {
			expect(error).toBeNull();
			expect(typeof result).toBe("string");
			done();
		});
	});

	it("should forward realpath errors to the callback", (done) => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		if (!decoratedFs.realpath) return done();
		decoratedFs.realpath(missing, (error, result) => {
			expect(error).toBeTruthy();
			expect(error.code).toBe("ENOENT");
			expect(result).toBeUndefined();
			done();
		});
	});

	it("should expose realpathSync", () => {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		if (!decoratedFs.realpathSync) return;
		expect(typeof decoratedFs.realpathSync(existing)).toBe("string");
	});

	it("should be absent when the backing fs has no realpathSync", () => {
		const fsMock = {
			statSync: () => ({}),
			readdirSync: () => [],
			readFileSync: () => Buffer.from(""),
			readlinkSync: () => "",
		};
		const decoratedFs = new SyncAsyncFileSystemDecorator(
			/** @type {any} */ (fsMock),
		);
		expect(decoratedFs.realpath).toBeUndefined();
		expect(decoratedFs.realpathSync).toBeUndefined();
	});
});
