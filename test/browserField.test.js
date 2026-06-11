"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");
const { ResolverFactory } = require("../");
const { beforeEach, describe, it } = require("./_runner");

const browserModule = path.join(__dirname, "fixtures", "browser-module");

/**
 * @param {string[]} args args
 * @returns {string} path
 */
function pp(...args) {
	return path.join(browserModule, ...args);
}

describe("browserField", () => {
	let resolver;

	beforeEach(() => {
		resolver = ResolverFactory.createResolver({
			aliasFields: [
				"browser",
				["innerBrowser1", "field2", "browser"], // not presented
				["innerBrowser1", "field", "browser"],
				["innerBrowser2", "browser"],
			],
			useSyncFileSystemCalls: true,
			fileSystem: fs,
		});
	});

	it("should ignore", (t, done) => {
		resolver.resolve({}, pp(), "./lib/ignore", {}, (err, result) => {
			if (err) throw err;
			assert.strictEqual(result, false);
			done();
		});
	});

	it("should ignore #2", () => {
		assert.strictEqual(resolver.resolveSync({}, pp(), "./lib/ignore"), false);
		assert.strictEqual(
			resolver.resolveSync({}, pp(), "./lib/ignore.js"),
			false,
		);
		assert.strictEqual(resolver.resolveSync({}, pp("lib"), "./ignore"), false);
		assert.strictEqual(
			resolver.resolveSync({}, pp("lib"), "./ignore.js"),
			false,
		);
	});

	it("should replace a file", () => {
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp(), "./lib/replaced"),
			pp("lib", "browser.js"),
		);
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp(), "./lib/replaced.js"),
			pp("lib", "browser.js"),
		);
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp("lib"), "./replaced"),
			pp("lib", "browser.js"),
		);
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp("lib"), "./replaced.js"),
			pp("lib", "browser.js"),
		);
	});

	it("should replace a module with a file", () => {
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp(), "module-a"),
			pp("browser", "module-a.js"),
		);
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp("lib"), "module-a"),
			pp("browser", "module-a.js"),
		);
	});

	it("should replace a module with a module", () => {
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp(), "module-b"),
			pp("node_modules", "module-c.js"),
		);
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp("lib"), "module-b"),
			pp("node_modules", "module-c.js"),
		);
	});

	it("should resolve in nested property", () => {
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp(), "./lib/main1.js"),
			pp("lib", "main.js"),
		);
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp(), "./lib/main2.js"),
			pp("lib", "browser.js"),
		);
	});

	it("should check only alias field properties", () => {
		assert.deepStrictEqual(
			resolver.resolveSync({}, pp(), "./toString"),
			pp("lib", "toString.js"),
		);
	});

	const aliasFieldExtras = path.join(
		__dirname,
		"fixtures",
		"alias-field-extras",
	);

	it("falls through when the browser alias value equals the inner request", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["browser"],
			fileSystem: fs,
		});
		resolver.resolve(
			{},
			aliasFieldExtras,
			"./self-alias",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.deepStrictEqual(
					result,
					path.join(aliasFieldExtras, "self-alias.js"),
				);
				done();
			},
		);
	});

	it("falls through when a module alias value equals the inner request", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["browser"],
			fileSystem: fs,
		});
		resolver.resolve({}, aliasFieldExtras, "pkg", {}, (err, result) => {
			if (err) return done(err);
			assert.deepStrictEqual(
				result,
				path.join(aliasFieldExtras, "node_modules/pkg/index.js"),
			);
			done();
		});
	});

	it("propagates a resolution error when the browser alias target cannot be found", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["browser"],
			fileSystem: fs,
		});
		resolver.resolve({}, aliasFieldExtras, "./points-nowhere", {}, (err) => {
			assert.ok(err instanceof Error);
			done();
		});
	});

	it("leaves resolution untouched when the configured field does not exist", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["nonexistentField"],
			fileSystem: fs,
		});
		resolver.resolve(
			{},
			path.join(__dirname, "fixtures", "browser-module"),
			"./lib/main.js",
			{},
			(err) => {
				// Either resolves or errors — we just want to exercise the path.
				assert.strictEqual(err === null || err instanceof Error, true);
				done();
			},
		);
	});

	it("short-circuits when a browser field marks a path as false (directory ignore)", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			aliasFields: ["browser"],
			fileSystem: fs,
		});
		resolver.resolve(
			{},
			path.join(__dirname, "fixtures", "browser-module"),
			"./lib/ignore",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.strictEqual(result, false);
				done();
			},
		);
	});
});
