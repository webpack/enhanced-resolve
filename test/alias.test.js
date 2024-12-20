const path = require("path");
const { Volume } = require("memfs");
const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const fs = require("fs");

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
				"/e/dir/file": ""
			},
			"/"
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
				ignored: false
			},
			modules: "/",
			useSyncFileSystemCalls: true,
			//@ts-ignore
			fileSystem: fileSystem
		});
	});

	it("should resolve a not aliased module", () => {
		expect(resolver.resolveSync({}, "/", "a")).toEqual("/a/index");
		expect(resolver.resolveSync({}, "/", "a/index")).toEqual("/a/index");
		expect(resolver.resolveSync({}, "/", "a/dir")).toEqual("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "a/dir/index")).toEqual(
			"/a/dir/index"
		);
	});
	it("should resolve an aliased module", () => {
		expect(resolver.resolveSync({}, "/", "aliasA")).toEqual("/a/index");
		expect(resolver.resolveSync({}, "/", "aliasA/index")).toEqual("/a/index");
		expect(resolver.resolveSync({}, "/", "aliasA/dir")).toEqual("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "aliasA/dir/index")).toEqual(
			"/a/dir/index"
		);
	});
	it('should resolve "#" alias', () => {
		expect(resolver.resolveSync({}, "/", "#")).toEqual("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "#/index")).toEqual("/c/dir/index");
	});
	it('should resolve "@" alias', () => {
		expect(resolver.resolveSync({}, "/", "@")).toEqual("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "@/index")).toEqual("/c/dir/index");
	});

	it("should resolve wildcard alias", () => {
		expect(resolver.resolveSync({}, "/", "@a")).toEqual("/a/index");
		expect(resolver.resolveSync({}, "/", "@a/dir")).toEqual("/a/dir/index");
		expect(resolver.resolveSync({}, "/", "@e/dir/file")).toEqual("/e/dir/file");
		expect(resolver.resolveSync({}, "/", "@e/anotherDir")).toEqual(
			"/e/anotherDir/index"
		);
		expect(resolver.resolveSync({}, "/", "@e/dir/file")).toEqual("/e/dir/file");
	});
	it("should resolve an ignore module", () => {
		expect(resolver.resolveSync({}, "/", "ignored")).toEqual(false);
	});
	it("should resolve a recursive aliased module", () => {
		expect(resolver.resolveSync({}, "/", "recursive")).toEqual(
			"/recursive/dir/index"
		);
		expect(resolver.resolveSync({}, "/", "recursive/index")).toEqual(
			"/recursive/dir/index"
		);
		expect(resolver.resolveSync({}, "/", "recursive/dir")).toEqual(
			"/recursive/dir/index"
		);
		expect(resolver.resolveSync({}, "/", "recursive/dir/index")).toEqual(
			"/recursive/dir/index"
		);
	});
	it("should resolve a file aliased module", () => {
		expect(resolver.resolveSync({}, "/", "b")).toEqual("/a/index");
		expect(resolver.resolveSync({}, "/", "c")).toEqual("/a/index");
	});
	it("should resolve a file aliased module with a query", () => {
		expect(resolver.resolveSync({}, "/", "b?query")).toEqual("/a/index?query");
		expect(resolver.resolveSync({}, "/", "c?query")).toEqual("/a/index?query");
	});
	it("should resolve a path in a file aliased module", () => {
		expect(resolver.resolveSync({}, "/", "b/index")).toEqual("/b/index");
		expect(resolver.resolveSync({}, "/", "b/dir")).toEqual("/b/dir/index");
		expect(resolver.resolveSync({}, "/", "b/dir/index")).toEqual(
			"/b/dir/index"
		);
		expect(resolver.resolveSync({}, "/", "c/index")).toEqual("/c/index");
		expect(resolver.resolveSync({}, "/", "c/dir")).toEqual("/c/dir/index");
		expect(resolver.resolveSync({}, "/", "c/dir/index")).toEqual(
			"/c/dir/index"
		);
	});
	it("should resolve a file aliased file", () => {
		expect(resolver.resolveSync({}, "/", "d")).toEqual("/c/index");
		expect(resolver.resolveSync({}, "/", "d/dir/index")).toEqual(
			"/c/dir/index"
		);
	});
	it("should resolve a file in multiple aliased dirs", () => {
		expect(resolver.resolveSync({}, "/", "multiAlias/dir/file")).toEqual(
			"/e/dir/file"
		);
		expect(resolver.resolveSync({}, "/", "multiAlias/anotherDir")).toEqual(
			"/e/anotherDir/index"
		);
	});
	it("should log the correct info", done => {
		const log = [];
		resolver.resolve(
			{},
			"/",
			"aliasA/dir",
			{ log: v => log.push(v) },
			(err, result) => {
				if (err) return done(err);

				expect(result).toEqual("/a/dir/index");
				expect(log).toMatchSnapshot();

				done();
			}
		);
	});

	it("should work with absolute paths", done => {
		const resolver = ResolverFactory.createResolver({
			alias: {
				[path.resolve(__dirname, "fixtures", "foo")]: false
			},
			modules: path.resolve(__dirname, "fixtures"),
			fileSystem: nodeFileSystem
		});

		resolver.resolve({}, __dirname, "foo/index", {}, (err, result) => {
			if (err) done(err);
			expect(result).toEqual(false);
			done();
		});
	});
});
