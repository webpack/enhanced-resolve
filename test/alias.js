require("should");
var ResolverFactory = require("../lib/ResolverFactory");
var MemoryFileSystem = require("memory-fs");
var { normalizeOptions } = require("../lib/AliasPlugin");

describe("alias", function() {
	var resolver;

	beforeEach(function() {
		var buf = Buffer.from("");
		var fileSystem = new MemoryFileSystem({
			"": true,
			a: {
				"": true,
				index: buf,
				dir: {
					"": true,
					index: buf
				}
			},
			recursive: {
				"": true,
				index: buf,
				dir: {
					"": true,
					index: buf
				}
			},
			b: {
				"": true,
				index: buf,
				dir: {
					"": true,
					index: buf
				}
			},
			c: {
				"": true,
				index: buf,
				dir: {
					"": true,
					index: buf
				}
			},
			d: {
				"": true,
				"index.js": buf,
				dir: {
					"": true
				}
			},
			e: {
				"": true,
				index: buf,
				anotherDir: {
					"": true,
					index: buf
				},
				dir: {
					"": true,
					file: buf
				}
			}
		});
		resolver = ResolverFactory.createResolver({
			alias: {
				aliasA: "a",
				b$: "a/index",
				c$: "/a/index",
				multiAlias: ["b", "c", "d", "e", "a"],
				recursive: "recursive/dir",
				"/d/dir": "/c/dir",
				"/d/index.js": "/c/index"
			},
			modules: "/",
			useSyncFileSystemCalls: true,
			fileSystem: fileSystem
		});
	});

	it("should resolve a not aliased module", function() {
		resolver.resolveSync({}, "/", "a").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "a/index").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "a/dir").should.be.eql("/a/dir/index");
		resolver.resolveSync({}, "/", "a/dir/index").should.be.eql("/a/dir/index");
	});
	it("should resolve an aliased module", function() {
		resolver.resolveSync({}, "/", "aliasA").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "aliasA/index").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "aliasA/dir").should.be.eql("/a/dir/index");
		resolver
			.resolveSync({}, "/", "aliasA/dir/index")
			.should.be.eql("/a/dir/index");
	});
	it("should resolve a recursive aliased module", function() {
		resolver
			.resolveSync({}, "/", "recursive")
			.should.be.eql("/recursive/dir/index");
		resolver
			.resolveSync({}, "/", "recursive/index")
			.should.be.eql("/recursive/dir/index");
		resolver
			.resolveSync({}, "/", "recursive/dir")
			.should.be.eql("/recursive/dir/index");
		resolver
			.resolveSync({}, "/", "recursive/dir/index")
			.should.be.eql("/recursive/dir/index");
	});
	it("should resolve a file aliased module", function() {
		resolver.resolveSync({}, "/", "b").should.be.eql("/a/index");
		resolver.resolveSync({}, "/", "c").should.be.eql("/a/index");
	});
	it("should resolve a file aliased module with a query", function() {
		resolver.resolveSync({}, "/", "b?query").should.be.eql("/a/index?query");
		resolver.resolveSync({}, "/", "c?query").should.be.eql("/a/index?query");
	});
	it("should resolve a path in a file aliased module", function() {
		resolver.resolveSync({}, "/", "b/index").should.be.eql("/b/index");
		resolver.resolveSync({}, "/", "b/dir").should.be.eql("/b/dir/index");
		resolver.resolveSync({}, "/", "b/dir/index").should.be.eql("/b/dir/index");
		resolver.resolveSync({}, "/", "c/index").should.be.eql("/c/index");
		resolver.resolveSync({}, "/", "c/dir").should.be.eql("/c/dir/index");
		resolver.resolveSync({}, "/", "c/dir/index").should.be.eql("/c/dir/index");
	});
	it("should resolve a file aliased file", function() {
		resolver.resolveSync({}, "/", "d").should.be.eql("/c/index");
		resolver.resolveSync({}, "/", "d/dir/index").should.be.eql("/c/dir/index");
	});
	it("should resolve a file in multiple aliased dirs", function() {
		resolver
			.resolveSync({}, "/", "multiAlias/dir/file")
			.should.be.eql("/e/dir/file");
		resolver
			.resolveSync({}, "/", "multiAlias/anotherDir")
			.should.be.eql("/e/anotherDir/index");
	});
});

describe("alias normalizeOptions", function() {
	it("should convert shorthanded type option with single alias", function() {
		normalizeOptions({ a: "./src/a" }).should.be.eql([
			{ name: "a", alias: "./src/a", onlyModule: false }
		]);
		normalizeOptions({ a: "./src/a", b: "./src/b" }).should.be.eql([
			{ name: "a", alias: "./src/a", onlyModule: false },
			{ name: "b", alias: "./src/b", onlyModule: false }
		]);
	});
	it("should convert shorthanded type option with multiple aliases", function() {
		normalizeOptions({ a: ["./src/a", "./lib/a"] }).should.be.eql([
			{ name: "a", alias: "./src/a", onlyModule: false },
			{ name: "a", alias: "./lib/a", onlyModule: false }
		]);
		normalizeOptions({
			a: ["./src/a", "./lib/a"],
			b: "./src/b"
		}).should.be.eql([
			{ name: "a", alias: "./src/a", onlyModule: false },
			{ name: "a", alias: "./lib/a", onlyModule: false },
			{ name: "b", alias: "./src/b", onlyModule: false }
		]);
		normalizeOptions({
			a: ["./src/a", "./lib/a"],
			b: ["./src/b", "./lib/b"]
		}).should.be.eql([
			{ name: "a", alias: "./src/a", onlyModule: false },
			{ name: "a", alias: "./lib/a", onlyModule: false },
			{ name: "b", alias: "./src/b", onlyModule: false },
			{ name: "b", alias: "./lib/b", onlyModule: false }
		]);
	});
	it("should pass through raw type options", function() {
		const options = [
			{ name: "a", alias: "./src/a", onlyModule: false },
			{ name: "b", alias: "./src/b", onlyModule: true },
			{ name: "c", alias: "./src/c", onlyModule: false }
		];
		normalizeOptions(options).should.be.eql(options);
	});
});
