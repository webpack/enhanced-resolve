var Resolver = require("../lib/Resolver");
var ModuleAliasPlugin = require("../lib/ModuleAliasPlugin");
var ModuleAsDirectoryPlugin = require("../lib/ModuleAsDirectoryPlugin");
var ModulesInRootPlugin = require("../lib/ModulesInRootPlugin");
var DirectoryDefaultFilePlugin = require("../lib/DirectoryDefaultFilePlugin");
var FileAppendPlugin = require("../lib/FileAppendPlugin");
var MemoryInputFileSystem = require("../lib/MemoryInputFileSystem");
var should = require("should");

describe("alias", function() {
	var resolver;

	beforeEach(function() {
		var fileSystem = new MemoryInputFileSystem({
			"": true,
			a: {
				"": true,
				index: "",
				dir: {
					"": true,
					index: ""
				}
			},
			recursive: {
				"": true,
				index: "",
				dir: {
					"": true,
					index: ""
				}
			},
			b: {
				"": true,
				index: "",
				dir: {
					"": true,
					index: ""
				}
			},
			c: {
				"": true,
				index: "",
				dir: {
					"": true,
					index: ""
				}
			}
		});
		resolver = new Resolver(fileSystem);
		resolver.apply(
			new ModuleAliasPlugin({
				aliasA: "a",
				"b$": "a/index",
				"c$": "/a/index",
				recursive: "recursive/dir"
			}),
			new ModulesInRootPlugin("module", "/"),
			new ModuleAsDirectoryPlugin("module"),
			new DirectoryDefaultFilePlugin(["index"]),
			new FileAppendPlugin([""])
		);
	});

	it("should resolve a not aliased module", function() {
		resolver.resolveSync("/", "a").should.be.eql("/a/index");
		resolver.resolveSync("/", "a/index").should.be.eql("/a/index");
		resolver.resolveSync("/", "a/dir").should.be.eql("/a/dir/index");
		resolver.resolveSync("/", "a/dir/index").should.be.eql("/a/dir/index");
	});
	it("should resolve an aliased module", function() {
		resolver.resolveSync("/", "aliasA").should.be.eql("/a/index");
		resolver.resolveSync("/", "aliasA/index").should.be.eql("/a/index");
		resolver.resolveSync("/", "aliasA/dir").should.be.eql("/a/dir/index");
		resolver.resolveSync("/", "aliasA/dir/index").should.be.eql("/a/dir/index");
	});
	it("should resolve a recursive aliased module", function() {
		resolver.resolveSync("/", "recursive").should.be.eql("/recursive/dir/index");
		resolver.resolveSync("/", "recursive/index").should.be.eql("/recursive/dir/index");
		resolver.resolveSync("/", "recursive/dir").should.be.eql("/recursive/dir/index");
		resolver.resolveSync("/", "recursive/dir/index").should.be.eql("/recursive/dir/index");
	});
	it("should resolve a file aliased module", function() {
		resolver.resolveSync("/", "b").should.be.eql("/a/index");
		resolver.resolveSync("/", "c").should.be.eql("/a/index");
	});
	it("should resolve a path in a file aliased module", function() {
		resolver.resolveSync("/", "b/index").should.be.eql("/b/index");
		resolver.resolveSync("/", "b/dir").should.be.eql("/b/dir/index");
		resolver.resolveSync("/", "b/dir/index").should.be.eql("/b/dir/index");
		resolver.resolveSync("/", "c/index").should.be.eql("/c/index");
		resolver.resolveSync("/", "c/dir").should.be.eql("/c/dir/index");
		resolver.resolveSync("/", "c/dir/index").should.be.eql("/c/dir/index");
	});

});