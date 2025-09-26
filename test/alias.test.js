"use strict";

const fs = require("fs");
const path = require("path");
const { Volume } = require("memfs");
const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("alias", () => {
	let resolver;

	beforeEach(() => {
		const fileSystem = Volume.fromJSON(
			{
				"/a/index": "",
				"/a/dir/index": "",
				"/recursive/index": "",
				"/recursive/dir/index": "",
				"/b/index": "",
				"/b/dir/index": "",
				"/c/index": "",
				"/c/dir/index": "",
				"/d/index.js": "",
				"/d/dir/.empty": "",
				"/e/index": "",
				"/e/anotherDir/index": "",
				"/e/dir/file": "",
				"/src/utils/a": "",
				"/src/components/b": "",
			},
			"/",
		);
		resolver = ResolverFactory.createResolver({
			alias: {
				aliasA: "a",
				b$: "a/index",
				c$: "/a/index",
				multiAlias: ["b", "c", "d", "e", "a"],
				recursive: "recursive/dir",
				"/d/dir": "/c/dir",
				"/d/index.js": "/c/index",
				// alias configuration should work
				"#": "/c/dir",
				"@": "/c/dir",
				"@*": "/*",
				"@e*": "/e/*",
				"@e*file": "/e*file",
				"@shared/*": ["/src/utils/*", "/src/components/*"],
				ignored: false,
			},
			modules: "/",
			useSyncFileSystemCalls: true,
			// @ts-expect-error for tests
			fileSystem,
		});
	});

	it("should resolve a not aliased module", () => {
		expect(resolver.resolveSync({}, "/", "a")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "a/index")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "a/dir")).toBe("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "a/dir/index")).toBe("/a/dir/index");
	});

	it("should resolve an aliased module", () => {
		expect(resolver.resolveSync({}, "/", "aliasA")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "aliasA/index")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "aliasA/dir")).toBe("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "aliasA/dir/index")).toBe(
			"/a/dir/index",
		);
	});

	it('should resolve "#" alias', () => {
		expect(resolver.resolveSync({}, "/", "#")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "#/index")).toBe("/c/dir/index");
	});

	it('should resolve "@" alias', () => {
		expect(resolver.resolveSync({}, "/", "@")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "@/index")).toBe("/c/dir/index");
	});

	it("should resolve wildcard alias", () => {
		expect(resolver.resolveSync({}, "/", "@a")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "@a/dir")).toBe("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "@e/dir/file")).toBe("/e/dir/file");
		expect(resolver.resolveSync({}, "/", "@e/anotherDir")).toBe(
			"/e/anotherDir/index",
		);
		expect(resolver.resolveSync({}, "/", "@e/dir/file")).toBe("/e/dir/file");
	});

	it("should resolve an ignore module", () => {
		expect(resolver.resolveSync({}, "/", "ignored")).toBe(false);
	});

	it("should resolve a recursive aliased module", () => {
		expect(resolver.resolveSync({}, "/", "recursive")).toBe(
			"/recursive/dir/index",
		);
		expect(resolver.resolveSync({}, "/", "recursive/index")).toBe(
			"/recursive/dir/index",
		);
		expect(resolver.resolveSync({}, "/", "recursive/dir")).toBe(
			"/recursive/dir/index",
		);
		expect(resolver.resolveSync({}, "/", "recursive/dir/index")).toBe(
			"/recursive/dir/index",
		);
	});

	it("should resolve a file aliased module", () => {
		expect(resolver.resolveSync({}, "/", "b")).toBe("/a/index");
		expect(resolver.resolveSync({}, "/", "c")).toBe("/a/index");
	});

	it("should resolve a file aliased module with a query", () => {
		expect(resolver.resolveSync({}, "/", "b?query")).toBe("/a/index?query");
		expect(resolver.resolveSync({}, "/", "c?query")).toBe("/a/index?query");
	});

	it("should resolve a path in a file aliased module", () => {
		expect(resolver.resolveSync({}, "/", "b/index")).toBe("/b/index");
		expect(resolver.resolveSync({}, "/", "b/dir")).toBe("/b/dir/index");
		expect(resolver.resolveSync({}, "/", "b/dir/index")).toBe("/b/dir/index");
		expect(resolver.resolveSync({}, "/", "c/index")).toBe("/c/index");
		expect(resolver.resolveSync({}, "/", "c/dir")).toBe("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "c/dir/index")).toBe("/c/dir/index");
	});

	it("should resolve a file aliased file", () => {
		expect(resolver.resolveSync({}, "/", "d")).toBe("/c/index");
		expect(resolver.resolveSync({}, "/", "d/dir/index")).toBe("/c/dir/index");
	});

	it("should resolve a file in multiple aliased dirs", () => {
		expect(resolver.resolveSync({}, "/", "multiAlias/dir/file")).toBe(
			"/e/dir/file",
		);
		expect(resolver.resolveSync({}, "/", "multiAlias/anotherDir")).toBe(
			"/e/anotherDir/index",
		);
	});

	it("should log the correct info", (done) => {
		const log = [];
		resolver.resolve(
			{},
			"/",
			"aliasA/dir",
			{ log: (v) => log.push(v) },
			(err, result) => {
				if (err) return done(err);

				expect(result).toBe("/a/dir/index");
				expect(log).toMatchSnapshot();

				done();
			},
		);
	});

	it("should work with absolute paths", (done) => {
		const resolver = ResolverFactory.createResolver({
			alias: {
				[path.resolve(__dirname, "fixtures", "foo")]: false,
			},
			modules: path.resolve(__dirname, "fixtures"),
			fileSystem: nodeFileSystem,
		});

		resolver.resolve({}, __dirname, "foo/index", {}, (err, result) => {
			if (err) done(err);
			expect(result).toBe(false);
			done();
		});
	});

	it("should resolve a wildcard alias with multiple targets correctly", () => {
		expect(resolver.resolveSync({}, "/", "@shared/b")).toBe(
			"/src/components/b",
		);
	});
});
