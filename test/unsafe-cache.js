var resolve = require("../");
var path = require("path");

describe("unsafe-cache", function() {
	var cache;
	var cachedResolve;
	var context;
	var otherContext;

	beforeEach(function() {
		context = {
			some: "context"
		};
		otherContext = {
			someOther: "context"
		};
	});

	describe("with no other options", function() {
		beforeEach(function() {
			cache = {};
			cachedResolve = resolve.create({
				unsafeCache: cache
			});
		});
		it("should cache request", function(done) {
			cachedResolve(path.join(__dirname, "fixtures"), "m2/b", function(
				err,
				result
			) {
				if (err) return done(err);
				Object.keys(cache).should.have.length(2);
				Object.keys(cache).forEach(function(key) {
					cache[key] = {
						path: "yep"
					};
				});
				cachedResolve(path.join(__dirname, "fixtures"), "m2/b", function(
					err,
					result
				) {
					if (err) return done(err);
					result.should.be.eql("yep");
					done();
				});
			});
		});
		it("should not return from cache if context does not match", function(done) {
			cachedResolve(context, path.join(__dirname, "fixtures"), "m2/b", function(
				err,
				result
			) {
				if (err) return done(err);
				Object.keys(cache).should.have.length(2);
				Object.keys(cache).forEach(function(key) {
					cache[key] = {
						path: "yep"
					};
				});
				cachedResolve(
					otherContext,
					path.join(__dirname, "fixtures"),
					"m2/b",
					function(err, result) {
						if (err) return done(err);
						result.should.not.be.eql("yep");
						done();
					}
				);
			});
		});
		it("should not return from cache if query does not match", function(done) {
			cachedResolve(path.join(__dirname, "fixtures"), "m2/b?query", function(
				err,
				result
			) {
				if (err) return done(err);
				Object.keys(cache).should.have.length(2);
				Object.keys(cache).forEach(function(key) {
					cache[key] = {
						path: "yep"
					};
				});
				cachedResolve(path.join(__dirname, "fixtures"), "m2/b?query2", function(
					err,
					result
				) {
					if (err) return done(err);
					result.should.not.be.eql("yep");
					done();
				});
			});
		});
	});

	describe("with cacheWithContext false", function() {
		beforeEach(function() {
			cache = {};
			cachedResolve = resolve.create({
				unsafeCache: cache,
				cacheWithContext: false
			});
		});
		it("should cache request", function(done) {
			cachedResolve(context, path.join(__dirname, "fixtures"), "m2/b", function(
				err,
				result
			) {
				if (err) return done(err);
				Object.keys(cache).should.have.length(2);
				Object.keys(cache).forEach(function(key) {
					cache[key] = {
						path: "yep"
					};
				});
				cachedResolve(
					context,
					path.join(__dirname, "fixtures"),
					"m2/b",
					function(err, result) {
						if (err) return done(err);
						result.should.be.eql("yep");
						done();
					}
				);
			});
		});
		it("should return from cache even if context does not match", function(done) {
			cachedResolve(context, path.join(__dirname, "fixtures"), "m2/b", function(
				err,
				result
			) {
				if (err) return done(err);
				Object.keys(cache).should.have.length(2);
				Object.keys(cache).forEach(function(key) {
					cache[key] = {
						path: "yep"
					};
				});
				cachedResolve(
					otherContext,
					path.join(__dirname, "fixtures"),
					"m2/b",
					function(err, result) {
						if (err) return done(err);
						result.should.be.eql("yep");
						done();
					}
				);
			});
		});
	});
});
