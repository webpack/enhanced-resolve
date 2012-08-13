var resolve = require("../lib/resolve");
var should = require("should");
var path = require("path");

describe("simple", function() {
	it("should resolve itself", function(done) {
		var pathsToIt = [
			[__dirname, "../lib/resolve"],
			[__dirname, "../"],
			[path.join(__dirname, "..", "..", ".."), "enhanced-require"],
			[path.join(__dirname, "..", "..", ".."), "enhanced-require/lib/resolve"]
		];
		pathsToIt.forEach(function(pathToIt) {
			resolve(pathToIt[0], pathToIt[1], function(err, filename) {
				if(err) throw err;
				should.exist(filename);
				filename.should.be.a("string");
				filename.should.be.eql(path.join(__dirname, "..", "lib", "resolve.js"));
			});
		});
	});

});