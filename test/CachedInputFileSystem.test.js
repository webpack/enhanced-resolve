const { CachedInputFileSystem } = require("../");

describe("CachedInputFileSystem OperationMergerBackend ('stat' and 'statSync')", () => {
	let fs;

	beforeEach(() => {
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
	afterEach(() => {
		fs.purge();
	});

	it("should join accesses", function (done) {
		fs.stat("a", function (err, result) {
			expect(result).toBeDefined();
			result.a = true;
		});
		fs.stat("a", function (err, result) {
			expect(result).toBeDefined();
			expect(result.a).toBeDefined();
			done();
		});
	});

	it("should not join accesses with options", function (done) {
		fs.stat("a", function (err, result) {
			expect(result).toBeDefined();
			result.a = true;
			expect(result.path).toEqual("a");
			expect(result.options).toBeUndefined();
		});
		fs.stat("a", { options: true }, function (err, result) {
			expect(result).toBeDefined();
			expect(result.a).toBeUndefined();
			expect(result.path).toEqual("a");
			expect(result.options).toMatchObject({ options: true });
			done();
		});
	});

	it("should not cache accesses", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
			fs.stat("a", function (err, result) {
				expect(result.a).toBeUndefined();
				done();
			});
		});
	});

	it("should not cache sync accesses", () => {
		const result = fs.statSync("a");
		result.a = true;
		const result2 = fs.statSync("a");

		expect(result2.a).toBeUndefined();
	});
});

describe("CachedInputFileSystem OperationMergerBackend ('lstat' and 'lstatSync')", () => {
	let fs;

	beforeEach(() => {
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
	afterEach(() => {
		fs.purge();
	});

	it("should join accesses", function (done) {
		fs.lstat("a", function (err, result) {
			expect(result).toBeDefined();
			result.a = true;
		});
		fs.lstat("a", function (err, result) {
			expect(result).toBeDefined();
			expect(result.a).toBeDefined();
			done();
		});
	});

	it("should not join accesses with options", function (done) {
		fs.lstat("a", function (err, result) {
			expect(result).toBeDefined();

			result.a = true;

			expect(result).toBeDefined();
			expect(result.path).toEqual("a");
			expect(result.options).toBeUndefined();
		});
		fs.lstat("a", { options: true }, function (err, result) {
			expect(result).toBeDefined();
			expect(result.a).toBeUndefined();
			expect(result.path).toEqual("a");
			expect(result.options).toMatchObject({ options: true });
			done();
		});
	});

	it("should not cache accesses", function (done) {
		fs.lstat("a", function (err, result) {
			result.a = true;
			fs.lstat("a", function (err, result) {
				expect(result.a).toBeUndefined();
				done();
			});
		});
	});

	it("should not cache sync accesses", () => {
		const result = fs.lstatSync("a");
		result.a = true;
		const result2 = fs.lstatSync("a");

		expect(result2.a).toBeUndefined();
	});
});

describe("CachedInputFileSystem OperationMergerBackend ('realpath' and 'realpathSync')", () => {
	let fs;

	beforeEach(() => {
		fs = new CachedInputFileSystem(
			{
				realpath: function (path, options, callback) {
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
				realpathSync: function (path, options) {
					return {
						path,
						options
					};
				}
			},
			0
		);
	});
	afterEach(() => {
		fs.purge();
	});

	it("should join accesses", function (done) {
		fs.realpath("a", function (err, result) {
			expect(result).toBeDefined();
			result.a = true;
		});
		fs.realpath("a", function (err, result) {
			expect(result).toBeDefined();
			expect(result.a).toBeDefined();
			done();
		});
	});

	it("should not join accesses with options", function (done) {
		fs.realpath("a", function (err, result) {
			expect(result).toBeDefined();

			result.a = true;

			expect(result).toBeDefined();
			expect(result.path).toEqual("a");
			expect(result.options).toBeUndefined();
		});
		fs.realpath("a", { options: true }, function (err, result) {
			expect(result).toBeDefined();
			expect(result.a).toBeUndefined();
			expect(result.path).toEqual("a");
			expect(result.options).toMatchObject({ options: true });
			done();
		});
	});

	it("should not cache accesses", function (done) {
		fs.realpath("a", function (err, result) {
			result.a = true;
			fs.realpath("a", function (err, result) {
				expect(result.a).toBeUndefined();
				done();
			});
		});
	});

	it("should not cache sync accesses", () => {
		const result = fs.realpathSync("a");
		result.a = true;
		const result2 = fs.realpathSync("a");

		expect(result2.a).toBeUndefined();
	});
});

describe("CachedInputFileSystem CacheBackend", () => {
	let fs;

	beforeEach(() => {
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
	afterEach(() => {
		fs.purge();
	});

	it("should join accesses", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
		});
		fs.stat("a", function (err, result) {
			expect(result.a).toBeDefined();
			done();
		});
	});

	it("should not call callback twice when combining sync and async calls", function (done) {
		let called = false;
		fs.stat("a", function (err, result) {
			if (called) return done(new Error("callback was called twice"));
			called = true;
			expect(result).toBeDefined();
			result.a = true;
			done();
		});
		const syncResult = fs.statSync("a");

		expect(syncResult).toBeDefined();
		expect(syncResult.a).toBeDefined();
	});

	it("should not join accesses with options", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
			expect(result.path).toEqual("a");
			expect(result.options).toBeUndefined();
		});
		fs.stat("a", { options: true }, function (err, result) {
			expect(result.a).toBeUndefined();
			expect(result.path).toEqual("a");
			expect(result.options).toMatchObject({ options: true });
			done();
		});
	});

	it("should cache accesses", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
			var sync = true;
			fs.stat("a", function (err, result) {
				expect(result.a).toBeDefined();
				expect(sync).toEqual(true);
				setTimeout(() => {
					fs.stat("a", function (err, result) {
						expect(result.a).toBeUndefined();
						result.b = true;
						var sync2 = true;
						fs.stat("a", function (err, result) {
							expect(result.b).toBeDefined();
							expect(result.a).toBeUndefined();
							expect(sync2).toEqual(true);
							done();
						});
						setTimeout(() => {
							sync2 = false;
						}, 50);
					});
				}, 1100);
			});
			setTimeout(() => {
				sync = false;
			}, 50);
		});
	});

	it("should cache sync accesses", () => {
		const result = fs.statSync("a");
		result.a = true;
		const result2 = fs.statSync("a");
		expect(result2.a).toBeDefined();
		const result3 = fs.statSync("a", { options: true });
		expect(result3.a).toBeUndefined();
		expect(result3.options).toMatchObject({ options: true });
	});

	it("should recover after passive periods", function (done) {
		fs.stat("a", function (err, result) {
			result.a = true;
			setTimeout(() => {
				fs.stat("a", function (err, result) {
					expect(result.a).toBeDefined();
					setTimeout(() => {
						fs.stat("a", function (err, result) {
							expect(result.a).toBeUndefined();
							result.b = true;
							setTimeout(() => {
								fs.stat("a", function (err, result) {
									expect(result.b).toBeDefined();
									expect(result.a).toBeUndefined();
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
			setTimeout(() => {
				fs.stat("a", function (err, result) {
					expect(result.a).toBeUndefined();
					result.b = true;
					setTimeout(() => {
						fs.stat("a", function (err, result) {
							expect(result.b).toBeDefined();
							expect(result.a).toBeUndefined();
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
			expect(r[0]).toEqual("0");
			fs.purge(["/test/path/sub/path"]);
			fs.readdir("/test/path", (err, r) => {
				expect(r[0]).toEqual("0");
				fs.purge(["/test/path/sub"]);
				fs.readdir("/test/path", (err, r) => {
					expect(r[0]).toEqual("1");
					fs.purge(["/test/path"]);
					fs.readdir("/test/path", (err, r) => {
						expect(r[0]).toEqual("2");
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
