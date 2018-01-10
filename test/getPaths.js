var getPaths = require("../lib/getPaths");

describe("getPaths", function() {
	it("should handle a path with no separators", function() {
		var paths = getPaths(".");
		paths.should.have.property("paths", ["."]);
		paths.should.have.property("seqments", ["."]);
	});
	it("should handle a path with multiple separators", function() {
		var paths = getPaths("./node_modules/react");
		paths.should.have.property("paths", ["./node_modules/react", "./node_modules", "."]);
		paths.should.have.property("seqments", ["react", "node_modules", "."]);
	});
});
