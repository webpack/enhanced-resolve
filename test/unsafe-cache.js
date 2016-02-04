var resolve = require("../");
var should = require("should");
var path = require("path");

describe("unsafe-cache", function() {
	it("should cache request", function(done) {

		var cache = {};
		var cachedResolve = resolve.create({
			unsafeCache: cache
		});

		cachedResolve(path.join(__dirname, "fixtures"), "m2/b", function(err, result) {
			if(err) return done(err);
			Object.keys(cache).should.have.length(2);
			Object.keys(cache).forEach(function(key) {
				cache[key] = {
					path: "yep"
				};
			});
			cachedResolve(path.join(__dirname, "fixtures"), "m2/b", function(err, result) {
				if(err) return done(err);
				result.should.be.eql("yep")
				done();
			});
		});
	});
	it("should not return from cache if query does not match", function(done) {
		var cache = {};
		var cachedResolve = resolve.create({
			unsafeCache: cache
		});

		cachedResolve(path.join(__dirname, "fixtures"), "m2/b?query", function(err, result) {
			if(err) return done(err);
			Object.keys(cache).should.have.length(2);
			Object.keys(cache).forEach(function(key) {
				cache[key] = {
					path: "yep"
				};
			});
			cachedResolve(path.join(__dirname, "fixtures"), "m2/b?query2", function(err, result) {
				if(err) return done(err);
				result.should.not.be.eql("yep")
				done();
			});
		});
	});
});
