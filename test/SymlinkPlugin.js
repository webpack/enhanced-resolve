var fs = require("graceful-fs");
var pathModule = require("path");
var SymlinkPlugin = require("../lib/SymlinkPlugin");
var ResolverFactory = require("../lib/ResolverFactory");

describe("SymlinkPlugin: circular links", function() {
	var resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: {
			stat: function(path, callback) {
				if(path === "C:\\foo\\bar\\baz\\qux\\node_modules") {
					return fs.stat(pathModule.join(__dirname, "..", "node_modules"), callback);
				}

				if(path === "C:\\foo\\bar\\baz\\qux\\lib\\app.js") {
					return fs.stat(pathModule.join(__dirname, "..", "lib", "node.js"), callback);
				}

				fs.stat(path, callback);
			},
			readFile: function(path, options, callback) {
				if(typeof options === "function") {
					callback = options;
					options = {};
				}

				if(path === "C:\\foo\\bar\\baz\\qux\\package.json") {
					return callback(null, JSON.stringify(require("../package.json")));
				}

				if(path === "C:\\foo\\bar\\baz\\qux\\lib\\app.js") {
					return callback(null, "console.log('foo')");
				}

				fs.readFile(path, options, callback);
			},
			readlink: function(path, options, callback) {
				if(typeof options === "function") {
					callback = options;
					options = {};
				}

				if(path === "C:") {
					return callback(null, "C:\\foo\\bar\\baz\\qux");
				}

				return callback();
			}
		}
	});

	it("should not loop forever", function(done) {
		const plugin = new SymlinkPlugin("file", "relative");
		plugin.apply(resolver);
		resolver.resolve({}, "C:\\foo\\bar\\baz\\qux", ".\\lib\\app.js", {}, done);
	});
});
