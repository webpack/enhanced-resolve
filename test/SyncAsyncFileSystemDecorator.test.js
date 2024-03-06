"use strict";

const fs = require("fs");
const path = require("path");
const SyncAsyncFileSystemDecorator = require("../lib/SyncAsyncFileSystemDecorator");

describe("SyncAsyncFileSystemDecorator  stat", function () {
	it("should use options when they're provided", function (done) {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.stat(
			path.join(__dirname, "fixtures", "decorated-fs", "exists.js"),
			{ bigint: true },
			function (error, result) {
				expect(error).toBeNull();
				expect(result).toHaveProperty("size");
				expect(result).toHaveProperty("birthtime");
				expect(
					typeof (/** @type {import("fs").BigIntStats} */ (result).size)
				).toEqual("bigint");
				done();
			}
		);
	});

	it("should work correctly when no options provided", function (done) {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.stat(
			path.join(__dirname, "fixtures", "decorated-fs", "exists.js"),
			function (error, result) {
				expect(error).toBeNull();
				expect(result).toHaveProperty("size");
				expect(result).toHaveProperty("birthtime");
				expect(
					typeof (/** @type {import("fs").Stats} */ (result).size)
				).toEqual("number");
				done();
			}
		);
	});
});
