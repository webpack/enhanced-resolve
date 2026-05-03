"use strict";

const path = require("path");
const resolve = require("../");

const fixtures = path.join(__dirname, "fixtures");

describe("win32 relative path resolution", () => {
	it("should resolve a win32 relative request with backslashes", (done) => {
		// Simulate the issue: on Windows, path.relative() returns "..\b.js"
		// instead of "../b.js". The resolver should handle both.
		const context = path.join(fixtures, "extensions");
		resolve(context, "..\\b.js", (err, result) => {
			if (err) return done(err);
			expect(result).toBe(path.join(fixtures, "b.js"));
			done();
		});
	});

	it("should resolve a win32 relative request with backslashes (sync)", () => {
		const context = path.join(fixtures, "extensions");
		const result = resolve.sync(context, "..\\b.js");
		expect(result).toBe(path.join(fixtures, "b.js"));
	});

	it("should resolve multi-level win32 relative paths", (done) => {
		const context = path.join(fixtures, "extensions", "foo");
		resolve(context, "..\\..\\a.js", (err, result) => {
			if (err) return done(err);
			expect(result).toBe(path.join(fixtures, "a.js"));
			done();
		});
	});

	it("should resolve win32 relative directory requests", (done) => {
		const context = path.join(fixtures, "extensions");
		resolve(context, ".\\foo", (err, result) => {
			if (err) return done(err);
			expect(result).toBe(path.join(fixtures, "extensions", "foo.js"));
			done();
		});
	});

	if (process.platform === "win32") {
		it("should resolve real path.relative() output on Windows", (done) => {
			const from = path.join(fixtures, "extensions");
			const to = path.join(fixtures, "b.js");
			const rel = path.relative(from, to);

			// On Windows, path.relative() produces backslash paths
			expect(rel).toContain("\\");

			resolve(from, rel, (err, result) => {
				if (err) return done(err);
				expect(result).toBe(to);
				done();
			});
		});
	}
});
