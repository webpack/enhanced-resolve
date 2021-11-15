var should = require("should");

var { CachedInputFileSystem } = require("../");

describe("CachedInputFileSystem OperationMergerBackend ('stat' and 'statSync')", function () {
	this.timeout(3000);
	var fs;

	beforeEach(function () {
		fs = new CachedInputFileSystem(
			{
				stat: function (path, options, callback) {
					if (!callback) {
						callback = options;
						options = undefined;
					}
					setTimeout(
						() =>
							callback(null, {
								path,
								options
							}),
						100
					);
				},
				statSync: function (path, options) {
					return {
						path,
						options
					};
				}
			},
			0
		);
	});
	afterEach(function () {
		fs.purge();
	});

	it("should join accesses", function (done) {
		fs.stat("a", function (err, result) {
			should.exist(result);
			result.a = true;
		});
		fs.stat("a", function (err, result) {
			should.exist(result);
			should.exist(result.a);
			done();
		});
	});

	it("should not join accesses with options", function (done) {
		fs.stat("a", function (err, result) {
			should.exist(result);
			result.a = true;
			result.path.should.be.eql("a");
			should.not.exist(result.options);
		});
		fs.stat("a", { options: true }, function (err, result) {
			should.exist(result);
			should.not.exist(result.a);
			result.path.should.be.eql("a");
			result.options.should.eql({ options: true });
			done();
		});
	});

	it("should not cache accesses", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
			fs.stat("a", function (err, result) {
				should.not.exist(result.a);
				done();
			});
		});
	});

	it("should not cache sync accesses", function () {
		const result = fs.statSync("a");
		result.a = true;
		const result2 = fs.statSync("a");
		should.not.exist(result2.a);
	});
});

describe("CachedInputFileSystem OperationMergerBackend ('lstat' and 'lstatSync')", function () {
	this.timeout(3000);
	var fs;

	beforeEach(function () {
		fs = new CachedInputFileSystem(
			{
				lstat: function (path, options, callback) {
					if (!callback) {
						callback = options;
						options = undefined;
					}
					setTimeout(
						() =>
							callback(null, {
								path,
								options
							}),
						100
					);
				},
				lstatSync: function (path, options) {
					return {
						path,
						options
					};
				}
			},
			0
		);
	});
	afterEach(function () {
		fs.purge();
	});

	it("should join accesses", function (done) {
		fs.lstat("a", function (err, result) {
			should.exist(result);
			result.a = true;
		});
		fs.lstat("a", function (err, result) {
			should.exist(result);
			should.exist(result.a);
			done();
		});
	});

	it("should not join accesses with options", function (done) {
		fs.lstat("a", function (err, result) {
			should.exist(result);
			result.a = true;
			result.path.should.be.eql("a");
			should.not.exist(result.options);
		});
		fs.lstat("a", { options: true }, function (err, result) {
			should.exist(result);
			should.not.exist(result.a);
			result.path.should.be.eql("a");
			result.options.should.eql({ options: true });
			done();
		});
	});

	it("should not cache accesses", function (done) {
		fs.lstat("a", function (err, result) {
			result.a = true;
			fs.lstat("a", function (err, result) {
				should.not.exist(result.a);
				done();
			});
		});
	});

	it("should not cache sync accesses", function () {
		const result = fs.lstatSync("a");
		result.a = true;
		const result2 = fs.lstatSync("a");
		should.not.exist(result2.a);
	});
});

describe("CachedInputFileSystem CacheBackend", function () {
	this.timeout(3000);
	var fs;

	beforeEach(function () {
		let counter = 0;
		fs = new CachedInputFileSystem(
			{
				stat: function (path, options, callback) {
					if (!callback) {
						callback = options;
						options = undefined;
					}
					setTimeout(
						callback.bind(null, null, {
							path,
							options
						}),
						100
					);
				},
				statSync: function (path, options) {
					return {
						path,
						options
					};
				},
				readdir: function (path, callback) {
					callback(null, [`${counter++}`]);
				}
			},
			1000
		);
	});
	afterEach(function () {
		fs.purge();
	});

	it("should join accesses", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
		});
		fs.stat("a", function (err, result) {
			should.exist(result.a);
			done();
		});
	});

	it("should not call callback twice when combining sync and async calls", function (done) {
		let called = false;
		fs.stat("a", function (err, result) {
			if (called) return done(new Error("callback was called twice"));
			called = true;
			should.exist(result);
			result.a = true;
			done();
		});
		const syncResult = fs.statSync("a");
		should.exist(syncResult);
		should.exist(syncResult.a);
	});

	it("should not join accesses with options", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
			result.path.should.be.eql("a");
			should.not.exist(result.options);
		});
		fs.stat("a", { options: true }, function (err, result) {
			should.not.exist(result.a);
			result.path.should.be.eql("a");
			result.options.should.eql({ options: true });
			done();
		});
	});

	it("should cache accesses", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
			var sync = true;
			fs.stat("a", function (err, result) {
				should.exist(result.a);
				sync.should.be.eql(true);
				setTimeout(function () {
					fs.stat("a", function (err, result) {
						should.not.exist(result.a);
						result.b = true;
						var sync2 = true;
						fs.stat("a", function (err, result) {
							should.not.exist(result.a);
							should.exist(result.b);
							sync2.should.be.eql(true);
							done();
						});
						setTimeout(function () {
							sync2 = false;
						}, 50);
					});
				}, 1100);
			});
			setTimeout(function () {
				sync = false;
			}, 50);
		});
	});

	it("should cache sync accesses", function () {
		const result = fs.statSync("a");
		result.a = true;
		const result2 = fs.statSync("a");
		should.exist(result2.a);
		const result3 = fs.statSync("a", { options: true });
		should.not.exist(result3.a);
		result3.options.should.be.eql({ options: true });
	});

	it("should recover after passive periods", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
			setTimeout(function () {
				fs.stat("a", function (err, result) {
					should.exist(result.a);
					setTimeout(function () {
						fs.stat("a", function (err, result) {
							should.not.exist(result.a);
							result.b = true;
							setTimeout(function () {
								fs.stat("a", function (err, result) {
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

	it("should restart after timeout", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
			setTimeout(function () {
				fs.stat("a", function (err, result) {
					should.not.exist(result.a);
					result.b = true;
					setTimeout(function () {
						fs.stat("a", function (err, result) {
							should.not.exist(result.a);
							should.exist(result.b);
							done();
						});
					}, 50);
				});
			}, 1100);
		});
	});

	it("should cache undefined value", function (done) {
		fs.stat(undefined, function (err, result) {
			fs.purge("a");
			fs.purge();
			done();
		});
	});

	it("should purge readdir correctly", function (done) {
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

	it("should not stack overflow when resolving in an async loop", done => {
		let i = 10000;
		const next = () => {
			fs.stat(__dirname, (err, result) => {
				if (i-- > 0) {
					next();
				} else {
					done();
				}
			});
		};
		next();
	});
});

describe("CachedInputFileSystem cached stats", function () {
	this.timeout(3000);
	it("should fallback to reading full file when size has changed", done => {
		let filePos = 0;
		const fs = new CachedInputFileSystem(
			{
				stat: (path, callback) => {
					callback(null, {
						size: 100
					});
				},
				readFile: (path, callback) => {
					callback(new Error("shouldn't be used"));
				},
				fstat: (fd, callback) => {
					callback(new Error("shouldn't be used"));
				},
				open: (path, flag, callback) => {
					path.should.be.eql("/any");
					flag.should.be.eql("r");
					filePos = 0;
					callback(null, 123);
				},
				read: (fd, buffer, offset, length, position, callback) => {
					fd.should.be.eql(123);
					length = Math.min(length, 32123 - filePos);
					filePos += length;
					buffer.fill(1, offset, offset + length);
					process.nextTick(callback, null, length);
				},
				close: (fd, callback) => {
					fd.should.be.eql(123);
					callback();
				}
			},
			10000
		);
		fs.stat("/any", (err, stats) => {
			if (err) return done(err);
			fs.readFile("/any", (err, buffer) => {
				if (err) return done(err);
				if (!buffer || typeof buffer === "string")
					return done(new Error("no buffer"));
				buffer.length.should.be.eql(32123);
				for (let i = 0; i < buffer.length; i++) {
					buffer[i].should.be.eql(1);
				}
				done();
			});
		});
	});
});
