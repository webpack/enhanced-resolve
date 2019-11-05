var CachedInputFileSystem = require("../lib/CachedInputFileSystem");
var should = require("should");

describe("CachedInputFileSystem", function() {
	this.timeout(3000);
	var fs;

	beforeEach(function() {
		let counter = 0;
		fs = new CachedInputFileSystem(
			{
				stat: function(path, callback) {
					setTimeout(
						callback.bind(null, null, {
							path: path
						}),
						100
					);
				},
				readdir: function(path, callback) {
					callback(null, [`${counter++}`]);
				}
			},
			1000
		);
	});
	afterEach(function() {
		fs.purge();
	});

	it("should join accesses", function(done) {
		fs.stat("a", function(err, result) {
			result.a = true;
		});
		fs.stat("a", function(err, result) {
			should.exist(result.a);
			done();
		});
	});

	it("should cache accesses", function(done) {
		fs.stat("a", function(err, result) {
			result.a = true;
			var sync = true;
			fs.stat("a", function(err, result) {
				should.exist(result.a);
				sync.should.be.eql(true);
				setTimeout(function() {
					fs.stat("a", function(err, result) {
						should.not.exist(result.a);
						result.b = true;
						var sync2 = true;
						fs.stat("a", function(err, result) {
							should.not.exist(result.a);
							should.exist(result.b);
							sync2.should.be.eql(true);
							done();
						});
						setTimeout(function() {
							sync2 = false;
						}, 50);
					});
				}, 1100);
			});
			setTimeout(function() {
				sync = false;
			}, 50);
		});
	});

	it("should recover after passive periods", function(done) {
		fs.stat("a", function(err, result) {
			result.a = true;
			setTimeout(function() {
				fs.stat("a", function(err, result) {
					should.exist(result.a);
					setTimeout(function() {
						fs.stat("a", function(err, result) {
							should.not.exist(result.a);
							result.b = true;
							setTimeout(function() {
								fs.stat("a", function(err, result) {
									should.not.exist(result.a);
									should.exist(result.b);
									done();
								});
							}, 500);
						});
					}, 600);
				});
			}, 500);
		});
	});

	it("should restart after timeout", function(done) {
		fs.stat("a", function(err, result) {
			result.a = true;
			setTimeout(function() {
				fs.stat("a", function(err, result) {
					should.not.exist(result.a);
					result.b = true;
					setTimeout(function() {
						fs.stat("a", function(err, result) {
							should.not.exist(result.a);
							should.exist(result.b);
							done();
						});
					}, 50);
				});
			}, 1100);
		});
	});

	it("should cache undefined value", function(done) {
		fs.stat(undefined, function(err, result) {
			fs.purge("a");
			fs.purge();
			done();
		});
	});

	it("should purge readdir correctly", function(done) {
		fs.readdir("/test/path", (err, r) => {
			r[0].should.be.eql("0");
			fs.purge(["/test/path/sub/path"]);
			fs.readdir("/test/path", (err, r) => {
				r[0].should.be.eql("0");
				fs.purge(["/test/path/sub"]);
				fs.readdir("/test/path", (err, r) => {
					r[0].should.be.eql("1");
					fs.purge(["/test/path"]);
					fs.readdir("/test/path", (err, r) => {
						r[0].should.be.eql("2");
						done();
					});
				});
			});
		});
	});
});
