"use strict";

// eslint's jest plugin static-analyzes `describe` calls and doesn't recognize
// `describeWin` below as one — disable `require-top-level-describe` for the
// whole file rather than scatter per-test ignore comments.
/* eslint-disable jest/require-top-level-describe, jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const { ResolverFactory } = require("../");

// DOS device paths (`\\?\…`, `\\.\…`) are Windows-only constructs. The real
// resolver tests below hit the actual filesystem through those prefixes, so
// they only make sense on a Windows host. `describe.skip` elsewhere keeps CI
// on other platforms green while still validating the pure logic via
// `path.test.js` and `identifier.test.js`.
const describeWin = process.platform === "win32" ? describe : describe.skip;

describeWin("DOS device path resolution (Windows)", () => {
	// `path.resolve` gives us the real Windows-absolute form of the fixtures
	// directory (e.g. `C:\…\test\fixtures`), which we then re-address through
	// the Win32 file (`\\?\`) and device (`\\.\`) namespaces.
	const fixtures = path.resolve(__dirname, "fixtures");
	const dosFixtures = `\\\\?\\${fixtures}`;
	const dotFixtures = `\\\\.\\${fixtures}`;

	// `symlinks: false` keeps the result verbatim — the realpath plugin would
	// otherwise strip the DOS prefix on Windows, masking what we want to test.
	// Default (async) filesystem calls are used — sync fs is deliberately
	// avoided so this exercises the same code paths as production resolves.
	const resolver = ResolverFactory.createResolver({
		fileSystem: fs,
		extensions: [".js"],
		symlinks: false,
	});

	test("resolves a relative request against a \\\\?\\ context", async () => {
		await expect(resolver.resolvePromise({}, dosFixtures, "./a")).resolves.toBe(
			path.join(dosFixtures, "a.js"),
		);
	});

	test("resolves a relative request to a subdirectory's index.js", async () => {
		await expect(
			resolver.resolvePromise({}, dosFixtures, "./foo"),
		).resolves.toBe(path.join(dosFixtures, "foo", "index.js"));
	});

	test("resolves '.' to index.js in a \\\\?\\ context", async () => {
		await expect(
			resolver.resolvePromise({}, path.join(dosFixtures, "foo"), "."),
		).resolves.toBe(path.join(dosFixtures, "foo", "index.js"));
	});

	test("resolves an absolute \\\\?\\ request regardless of context", async () => {
		const request = path.join(dosFixtures, "a");
		await expect(resolver.resolvePromise({}, fixtures, request)).resolves.toBe(
			path.join(dosFixtures, "a.js"),
		);
	});

	test("resolves through the \\\\.\\ device namespace", async () => {
		// The `\\.\` walk used to infinite-loop in `cdUp` once it reached
		// the bare `\` root — this test proves it terminates.
		await expect(resolver.resolvePromise({}, dotFixtures, "./a")).resolves.toBe(
			path.join(dotFixtures, "a.js"),
		);
	});

	test("preserves a query string on a \\\\?\\ request", async () => {
		// The literal `?` inside `\\?\` must not be mistaken for a query
		// separator — the real query is the one trailing the path.
		const request = `${path.join(dosFixtures, "a")}?foo=bar`;
		await expect(resolver.resolvePromise({}, fixtures, request)).resolves.toBe(
			`${path.join(dosFixtures, "a.js")}?foo=bar`,
		);
	});

	test("preserves a fragment on a \\\\?\\ request", async () => {
		const request = `${path.join(dosFixtures, "a")}#frag`;
		await expect(resolver.resolvePromise({}, fixtures, request)).resolves.toBe(
			`${path.join(dosFixtures, "a.js")}#frag`,
		);
	});

	test("rejects a missing file under a DOS device context", async () => {
		await expect(
			resolver.resolvePromise({}, dosFixtures, "./does-not-exist"),
		).rejects.toThrow(/Can't resolve/);
	});

	test("locates the nearest package.json when resolving through \\\\?\\", (done) => {
		// Uses the callback form because the `request` (third callback arg)
		// carries `descriptionFilePath`, which the promise form drops.
		resolver.resolve(
			{},
			path.join(dosFixtures, "foo"),
			".",
			{},
			(err, result, request) => {
				if (err) return done(err);
				expect(result).toBe(path.join(dosFixtures, "foo", "index.js"));
				// The description-file walk must terminate — if `cdUp` didn't
				// treat bare `\` as a root, this callback would never fire.
				expect(/** @type {any} */ (request).descriptionFilePath).toBe(
					path.join(dosFixtures, "foo", "package.json"),
				);
				done();
			},
		);
	});
});
