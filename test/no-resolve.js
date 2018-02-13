var resolve = require("../");
var path = require("path");

describe("no resolve", function() {
	it("should check and tell wrong case usage in case-sensitive system", function(done) {
		resolve(path.join(__dirname, "fixtures"), "./WRONGcASE", function(err) {
			if(err) { // will not found only in case-sensitive system.
				err.message.should.containEql("wrong case path");
				err.message.should.containEql("'WRONGcASE'");
				err.message.should.containEql("'wrongCase'");

				//right case but non-existent file
				resolve(path.join(__dirname, "fixtures"), "./wrongCase/missing-file", function(_err) {
					_err.message.should.not.containEql("wrong case path");
					done();
				});
			} else { //case-insensitive, shouldn't check case when not found.
				resolve(path.join(__dirname, "fixtures"), "./WRONGcASE/missing-file", function(_err) {
					_err.message.should.not.containEql("wrong case path");
					_err.message.should.not.containEql("'WRONGcASE'");
					_err.message.should.not.containEql("'wrongCase'");
					done();
				});
			}
		});
	});
});
