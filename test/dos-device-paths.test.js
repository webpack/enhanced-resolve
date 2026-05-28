"use strict";

const assert = require("assert");
const fs = require("fs");
const { describe, test } = require("node:test");

/* eslint-disable jsdoc/reject-any-type */

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
		assert.strictEqual(
			await resolver.resolvePromise({}, dosFixtures, "./a"),
			path.join(dosFixtures, "a.js"),
		);
	});

	test("resolves a relative request to a subdirectory's index.js", async () => {
		assert.strictEqual(
			await resolver.resolvePromise({}, dosFixtures, "./foo"),
			path.join(dosFixtures, "foo", "index.js"),
		);
	});

	test("resolves '.' to index.js in a \\\\?\\ context", async () => {
		assert.strictEqual(
			await resolver.resolvePromise({}, path.join(dosFixtures, "foo"), "."),
			path.join(dosFixtures, "foo", "index.js"),
		);
	});

	test("resolves an absolute \\\\?\\ request regardless of context", async () => {
		const request = path.join(dosFixtures, "a");
		assert.strictEqual(
			await resolver.resolvePromise({}, fixtures, request),
			path.join(dosFixtures, "a.js"),
		);
	});

	test("resolves through the \\\\.\\ device namespace", async () => {
		// The `\\.\` walk used to infinite-loop in `cdUp` once it reached
		// the bare `\` root — this test proves it terminates.
		assert.strictEqual(
			await resolver.resolvePromise({}, dotFixtures, "./a"),
			path.join(dotFixtures, "a.js"),
		);
	});

	test("preserves a query string on a \\\\?\\ request", async () => {
		// The literal `?` inside `\\?\` must not be mistaken for a query
		// separator — the real query is the one trailing the path.
		const request = `${path.join(dosFixtures, "a")}?foo=bar`;
		assert.strictEqual(
			await resolver.resolvePromise({}, fixtures, request),
			`${path.join(dosFixtures, "a.js")}?foo=bar`,
		);
	});

	test("preserves a fragment on a \\\\?\\ request", async () => {
		const request = `${path.join(dosFixtures, "a")}#frag`;
		assert.strictEqual(
			await resolver.resolvePromise({}, fixtures, request),
			`${path.join(dosFixtures, "a.js")}#frag`,
		);
	});

	test("rejects a missing file under a DOS device context", async () => {
		await assert.rejects(
			resolver.resolvePromise({}, dosFixtures, "./does-not-exist"),
			/Can't resolve/,
		);
	});

	test("locates the nearest package.json when resolving through \\\\?\\", (t, done) => {
		// Uses the callback form because the `request` (third callback arg)
		// carries `descriptionFilePath`, which the promise form drops.
		resolver.resolve(
			{},
			path.join(dosFixtures, "foo"),
			".",
			{},
			(err, result, request) => {
				if (err) return done(err);
				assert.strictEqual(result, path.join(dosFixtures, "foo", "index.js"));
				// The description-file walk must terminate — if `cdUp` didn't
				// treat bare `\` as a root, this callback would never fire.
				assert.strictEqual(
					/** @type {any} */ (request).descriptionFilePath,
					path.join(dosFixtures, "foo", "package.json"),
				);
				done();
			},
		);
	});
});
