require("should");
var ResolverFactory = require("../lib/ResolverFactory");
var MemoryFileSystem = require("memory-fs");

describe("modules", function() {
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
				myDir: {
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
						}
					}
				}
			},
			other: {
				"": true,
				node_modules: {
					"": true,
					a: {
						"": true,
						"index.js": buf,
						node_modules: {
							"": true,
							e: {
								"": true,
								"index.js": buf
							}
						}
					},
					d: {
						"": true,
						"index.js": buf
					}
				}
			}
		});
		resolver = ResolverFactory.createResolver({
			modules: ["/other/node_modules/a/node_modules", "node_modules"],
			useSyncFileSystemCalls: true,
			fileSystem: fileSystem
		});
	});

	it("should resolve modules on path", function() {
		resolver
			.resolveSync({}, "/someDir/myDir/node_modules/a/node_modules", "a")
			.should.be.eql("/someDir/myDir/node_modules/a/index.js");
		resolver
			.resolveSync({}, "/someDir/myDir/node_modules", "a")
			.should.be.eql("/someDir/myDir/node_modules/a/index.js");
		resolver
			.resolveSync({}, "/someDir/myDir/node_modules/a/node_modules", "b")
			.should.be.eql("/someDir/myDir/node_modules/a/node_modules/b/index.js");
		resolver
			.resolveSync({}, "/someDir/myDir/node_modules/a/node_modules", "c")
			.should.be.eql("/someDir/node_modules/c/index.js");
		resolver
			.resolveSync({}, "/someDir/myDir/node_modules/a/node_modules", "e")
			.should.be.eql("/other/node_modules/a/node_modules/e/index.js");
	});

	it("should not resolve modules outside of path", function() {
		try {
			resolver
				.resolveSync({}, "/someDir/myDir/", "b")
				.should.be.eql("/someDir/myDir/node_modules/b/index.js");
		} catch (e) {
			e.toString().should.be.eql(
				"Error: Can't resolve 'b' in '/someDir/myDir/'"
			);
		}
		try {
			resolver
				.resolveSync({}, "/someDir/myDir/node_modules/a/node_modules", "d")
				.should.be.eql("");
		} catch (e) {
			e.toString().should.be.eql(
				"Error: Can't resolve 'd' in '/someDir/myDir/node_modules/a/node_modules'"
			);
		}
	});
});
