"use strict";

const assert = require("assert");

const { Volume } = require("memfs");
const { ResolverFactory } = require("../");
const { beforeEach, describe, it } = require("./_runner");

describe("fallback", () => {
	let resolver;

	beforeEach(() => {
		const fileSystem = Volume.fromJSON(
			{
				"/a/index": "",
				"/a/dir/index": "",
				"/recursive/index": "",
				"/recursive/dir/index": "",
				"/recursive/dir/file": "",
				"/recursive/dir/dir/index": "",
				"/b/index": "",
				"/b/dir/index": "",
				"/c/index": "",
				"/c/dir/index": "",
				"/d/index.js": "",
				"/d/dir/.empty": "",
				"/e/index": "",
				"/e/anotherDir/index": "",
				"/e/dir/file": "",
			},
			"/",
		);
		resolver = ResolverFactory.createResolver({
			fallback: {
				aliasA: "a",
				b$: "a/index",
				c$: "/a/index",
				multiAlias: ["b", "c", "d", "e", "a"],
				recursive: "recursive/dir",
				"/d/dir": "/c/dir",
				"/d/index.js": "/c/index",
				ignored: false,
			},
			modules: "/",
			useSyncFileSystemCalls: true,
			// @ts-expect-error for test
			fileSystem,
		});
	});

	it("should resolve a not aliased module", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "a"), "/a/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "a/index"), "/a/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "a/dir"), "/a/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "a/dir/index"),
			"/a/dir/index",
		);
	});

	it("should resolve an fallback module", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "aliasA"), "/a/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "aliasA/index"),
			"/a/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "aliasA/dir"),
			"/a/dir/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "aliasA/dir/index"),
			"/a/dir/index",
		);
	});

	it("should resolve an ignore module", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "ignored"), false);
	});

	it("should resolve a recursive aliased module", () => {
		assert.strictEqual(
			resolver.resolveSync({}, "/", "recursive"),
			"/recursive/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "recursive/index"),
			"/recursive/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "recursive/dir"),
			"/recursive/dir/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "recursive/dir/index"),
			"/recursive/dir/index",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "recursive/file"),
			"/recursive/dir/file",
		);
	});

	it("should resolve a file aliased module with a query", () => {
		assert.strictEqual(
			resolver.resolveSync({}, "/", "b?query"),
			"/b/index?query",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "c?query"),
			"/c/index?query",
		);
	});

	it("should resolve a path in a file aliased module", () => {
		assert.strictEqual(resolver.resolveSync({}, "/", "b/index"), "/b/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "b/dir"), "/b/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "b/dir/index"),
			"/b/dir/index",
		);
		assert.strictEqual(resolver.resolveSync({}, "/", "c/index"), "/c/index");
		assert.strictEqual(resolver.resolveSync({}, "/", "c/dir"), "/c/dir/index");
		assert.strictEqual(
			resolver.resolveSync({}, "/", "c/dir/index"),
			"/c/dir/index",
		);
	});

	it("should resolve a file in multiple aliased dirs", () => {
		assert.strictEqual(
			resolver.resolveSync({}, "/", "multiAlias/dir/file"),
			"/e/dir/file",
		);
		assert.strictEqual(
			resolver.resolveSync({}, "/", "multiAlias/anotherDir"),
			"/e/anotherDir/index",
		);
	});

	it("should log the correct info", (t, done) => {
		const log = [];
		resolver.resolve(
			{},
			"/",
			"aliasA/dir",
			{ log: (v) => log.push(v) },
			(err, result) => {
				if (err) return done(err);
				assert.strictEqual(result, "/a/dir/index");
				assert.deepStrictEqual(log, [
					"resolve 'aliasA/dir' in '/'",
					"  Parsed request is a module",
					"  No description file found in / or above",
					"  resolve as module",
					"    looking for modules in /",
					"      /aliasA doesn't exist",
					"  aliased with mapping 'aliasA': 'a' to 'a/dir'",
					"    Parsed request is a module",
					"    No description file found in / or above",
					"    resolve as module",
					"      looking for modules in /",
					"        existing directory /a",
					"          No description file found in /a or above",
					"          No description file found in /a or above",
					"          no extension",
					"            /a/dir is not a file",
					"          .js",
					"            /a/dir.js doesn't exist",
					"          .json",
					"            /a/dir.json doesn't exist",
					"          .node",
					"            /a/dir.node doesn't exist",
					"          as directory",
					"            existing directory /a/dir",
					"              No description file found in /a/dir or above",
					"              using path: /a/dir/index",
					"                No description file found in /a/dir or above",
					"                no extension",
					"                  existing file: /a/dir/index",
					"                    reporting result /a/dir/index",
				]);
				done();
			},
		);
	});
});
