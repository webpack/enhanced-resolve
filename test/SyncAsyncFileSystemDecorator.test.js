"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const SyncAsyncFileSystemDecorator = require("../lib/SyncAsyncFileSystemDecorator");
const { describe, it } = require("./_runner");

const file = path.join(__dirname, "fixtures", "abc.txt");
const content = fs.readFileSync(file);

describe("SyncAsyncFileSystemDecorator", () => {
	const decorated = new SyncAsyncFileSystemDecorator(fs);

	it("should read a buffer without options", () => {
		assert.deepStrictEqual(decorated.readFileSync(file), content);
	});

	it("should read a buffer with null options", () => {
		assert.deepStrictEqual(decorated.readFileSync(file, null), content);
	});

	it("should read a string with an encoding", () => {
		assert.strictEqual(
			decorated.readFileSync(file, "utf8"),
			content.toString("utf8"),
		);
	});

	it("should read a string with an options object", () => {
		assert.strictEqual(
			decorated.readFileSync(file, { encoding: "utf8" }),
			content.toString("utf8"),
		);
	});

	it("should pass each kind of options through readFile", (t, done) => {
		decorated.readFile(file, "utf8", (err, encoded) => {
			if (err) return done(err);
			assert.strictEqual(encoded, content.toString("utf8"));
			decorated.readFile(file, { encoding: "utf8" }, (err, fromObject) => {
				if (err) return done(err);
				assert.strictEqual(fromObject, content.toString("utf8"));
				decorated.readFile(file, null, (err, raw) => {
					if (err) return done(err);
					assert.deepStrictEqual(raw, content);
					decorated.readFile(file, (err, noOptions) => {
						if (err) return done(err);
						assert.deepStrictEqual(noOptions, content);
						done();
					});
				});
			});
		});
	});
});
