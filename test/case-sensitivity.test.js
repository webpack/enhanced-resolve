"use strict";

const fs = require("fs");
const path = require("path");
const resolve = require("../");

const fixtureDir = path.join(__dirname, "fixtures", "case-sensitivity");
const onDiskFile = path.join(fixtureDir, "Hello.js");

// Probe the actual filesystem we're running on. Resolving the
// case-mismatch correctly is only meaningful on case-insensitive
// filesystems (macOS APFS, Windows NTFS by default); on
// case-sensitive Linux ext4 a wrong-cased import legitimately does
// not exist and the resolver should still report a miss. Skip the
// suite when the host fs is case-sensitive instead of mocking it.
const isCaseInsensitiveFs = (() => {
	try {
		fs.statSync(path.join(fixtureDir, "hello.js"));
		return true;
	} catch (_err) {
		return false;
	}
})();

describe("case-insensitive filesystem (watchpack#228)", () => {
	if (isCaseInsensitiveFs) {
		it("normalizes the resolved path to the on-disk casing", (done) => {
			resolve(fixtureDir, "./hello", (err, result) => {
				if (err) return done(err);
				expect(result).toBe(onDiskFile);
				done();
			});
		});

		it("records the on-disk casing in fileDependencies", (done) => {
			const fileDependencies = new Set();
			const missingDependencies = new Set();
			resolve(
				fixtureDir,
				"./HELLO",
				{ fileDependencies, missingDependencies },
				(err, result) => {
					if (err) return done(err);
					expect(result).toBe(onDiskFile);
					expect(fileDependencies.has(onDiskFile)).toBe(true);
					expect(fileDependencies.has(path.join(fixtureDir, "HELLO.js"))).toBe(
						false,
					);
					done();
				},
			);
		});

		it("leaves the path untouched when the casing already matches", (done) => {
			resolve(fixtureDir, "./Hello", (err, result) => {
				if (err) return done(err);
				expect(result).toBe(onDiskFile);
				done();
			});
		});
	} else {
		// eslint-disable-next-line jest/expect-expect
		it("cannot test case normalization on a case-sensitive filesystem", () => {
			// Nothing
		});
	}
});
