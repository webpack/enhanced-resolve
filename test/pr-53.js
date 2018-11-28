var CachedInputFileSystem = require("../lib/CachedInputFileSystem");

describe("pr-53", function() {
	it("should allow to readJsonSync in CachedInputFileSystem", function() {
		var cfs = new CachedInputFileSystem(
			{
				readFileSync: function(path) {
					return JSON.stringify("abc" + path);
				}
			},
			1000
		);
		cfs.readJsonSync("xyz").should.be.eql("abcxyz");
	});
});
