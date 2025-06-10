"use strict";

const fs = require("fs");
const path = require("path");
const SyncAsyncFileSystemDecorator = require("../lib/SyncAsyncFileSystemDecorator");

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
});
