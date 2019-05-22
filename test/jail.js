require("should");
var ResolverFactory = require("../lib/ResolverFactory");
var MemoryFileSystem = require("memory-fs");

describe("jail", function() {
	var resolver;

	beforeEach(function() {
		var buf = Buffer.from("");
		var fileSystem = new MemoryFileSystem({
			"": true,
			someDir: {
				"": true,
				node_modules: {
					"": true,
					a: {
						"": true,
						"index.js": buf
					},
					c: {
						"": true,
						"index.js": buf
					}
				},
				myJail: {
					"": true,
					index: buf,
					node_modules: {
						"": true,
						a: {
							"": true,
							"index.js": buf,
							node_modules: {
								"": true,
								b: {
									"": true,
									"index.js": buf
								}
							}
						},
						b: {
							"": true,
							"index.js": buf
						}
					}
				}
			},
			other: {
				"": true,
				node_modules: {
					a: {
						"": true,
						"index.js": buf
					},
					d: {
						"": true,
						"index.js": buf
					}
				}
			}
		});
		resolver = ResolverFactory.createResolver({
			modules: ["/other/node_modules", "node_modules"],
			useSyncFileSystemCalls: true,
			fileSystem: fileSystem,
			jail: "/someDir/myJail"
		});
	});

	it("should resolve modules in jail", function() {
		resolver
			.resolveSync({}, "/someDir/myJail/node_modules/a/node_modules", "a")
			.should.be.eql("/someDir/myJail/node_modules/a/index.js");
		resolver
			.resolveSync({}, "/someDir/myJail/node_modules/a/node_modules", "b")
			.should.be.eql("/someDir/myJail/node_modules/a/node_modules/b/index.js");
		resolver
			.resolveSync({}, "/someDir/myJail/", "b")
			.should.be.eql("/someDir/myJail/node_modules/b/index.js");
	});

	it("should not resolve modules outside of jail", function() {
		try {
			resolver
				.resolveSync({}, "/someDir/myJail/node_modules/a/node_modules", "c")
				.should.be.eql("");
		} catch (e) {
			e.toString().should.be.eql(
				"Error: Can't resolve 'c' in '/someDir/myJail/node_modules/a/node_modules'"
			);
		}
		try {
			resolver
				.resolveSync({}, "/someDir/myJail/node_modules/a/node_modules", "d")
				.should.be.eql("");
		} catch (e) {
			e.toString().should.be.eql(
				"Error: Can't resolve 'd' in '/someDir/myJail/node_modules/a/node_modules'"
			);
		}
	});

	it("should not resolve modules from path outside jail", function() {
		try {
			resolver.resolveSync({}, "/someDir", "a").should.be.eql("");
		} catch (e) {
			e.toString().should.be.eql("Error: Can't resolve 'a' in '/someDir'");
		}
		try {
			resolver.resolveSync({}, "/someDir", "b").should.be.eql("");
		} catch (e) {
			e.toString().should.be.eql("Error: Can't resolve 'b' in '/someDir'");
		}
	});
});
