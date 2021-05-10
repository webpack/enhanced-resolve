"use strict";

const fs = require("fs");
const path = require("path");
const should = require("should");
const SyncAsyncFileSystemDecorator = require("../lib/SyncAsyncFileSystemDecorator");

describe("SyncAsyncFileSystemDecorator  stat", function () {
	it("should use options when they're provided", function (done) {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.stat(
			path.join(__dirname, "fixtures", "decorated-fs", "exists.js"),
			{ bigint: true },
			function (error, result) {
				should(error).be.null();
				should(result).have.properties(["size", "birthtime"]);
				should(result.size).be.of.type("bigint");
				done();
			}
		);
	});

	it("should work correctly when no options provided", function (done) {
		const decoratedFs = new SyncAsyncFileSystemDecorator(fs);
		decoratedFs.stat(
			path.join(__dirname, "fixtures", "decorated-fs", "exists.js"),
			function (error, result) {
				should(error).be.null();
				should(result).have.properties(["size", "birthtime"]);
				should(result.size).be.of.type("number");
				done();
			}
		);
	});
});
