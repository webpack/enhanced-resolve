"use strict";

const path = require("path");
const url = require("url");
const { CachedInputFileSystem } = require("../");

describe("cachedInputFileSystem OperationMergerBackend ('stat' and 'statSync')", () => {
	let fs;

	beforeEach(() => {
		fs = new CachedInputFileSystem(
			{
				stat(path, options, callback) {
					if (!callback) {
						callback = options;
						options = undefined;
					}
					setTimeout(
						() =>
							callback(null, {
								path,
								options,
							}),
						100,
					);
				},
				// @ts-expect-error for tests
				statSync(path, options) {
					return {
						path,
						options,
					};
				},
			},
			0,
		);
	});

	afterEach(() => {
		fs.purge();
	});

	it("should join accesses", (done) => {
		fs.stat("a", (err, result) => {
			expect(result).toBeDefined();
			result.a = true;
		});
		fs.stat("a", (err, result) => {
			expect(result).toBeDefined();
			expect(result.a).toBeDefined();
			done();
		});
	});

	it("should not join accesses with options", (done) => {
		fs.stat("a", (err, result) => {
			expect(result).toBeDefined();
			result.a = true;
			expect(result.path).toBe("a");
			expect(result.options).toBeUndefined();
		});
		fs.stat("a", { options: true }, (err, result) => {
			expect(result).toBeDefined();
			expect(result.a).toBeUndefined();
			expect(result.path).toBe("a");
			expect(result.options).toMatchObject({ options: true });
			done();
		});
	});

	it("should not cache accesses", (done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			fs.stat("a", (err, result) => {
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

describe("cachedInputFileSystem OperationMergerBackend ('lstat' and 'lstatSync')", () => {
	let fs;

	beforeEach(() => {
		fs = new CachedInputFileSystem(
			{
				lstat(path, options, callback) {
					if (!callback) {
						callback = options;
						options = undefined;
					}
					setTimeout(
						() =>
							callback(null, {
								path,
								options,
							}),
						100,
					);
				},
				// @ts-expect-error for tests
				lstatSync(path, options) {
					return {
						path,
						options,
					};
				},
			},
			0,
		);
	});

	afterEach(() => {
		fs.purge();
	});

	it("should join accesses", (done) => {
		fs.lstat("a", (err, result) => {
			expect(result).toBeDefined();
			result.a = true;
		});
		fs.lstat("a", (err, result) => {
			expect(result).toBeDefined();
			expect(result.a).toBeDefined();
			done();
		});
	});

	it("should not join accesses with options", (done) => {
		fs.lstat("a", (err, result) => {
			expect(result).toBeDefined();

			result.a = true;

			expect(result).toBeDefined();
			expect(result.path).toBe("a");
			expect(result.options).toBeUndefined();
		});
		fs.lstat("a", { options: true }, (err, result) => {
			expect(result).toBeDefined();
			expect(result.a).toBeUndefined();
			expect(result.path).toBe("a");
			expect(result.options).toMatchObject({ options: true });
			done();
		});
	});

	it("should not cache accesses", (done) => {
		fs.lstat("a", (err, result) => {
			result.a = true;
			fs.lstat("a", (err, result) => {
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

describe("cachedInputFileSystem OperationMergerBackend ('realpath' and 'realpathSync')", () => {
	let fs;

	beforeEach(() => {
		fs = new CachedInputFileSystem(
			{
				realpath(path, options, callback) {
					if (!callback) {
						callback = options;
						options = undefined;
					}
					setTimeout(
						() =>
							callback(null, {
								path,
								options,
							}),
						100,
					);
				},
				// @ts-expect-error for tests
				realpathSync(path, options) {
					return {
						path,
						options,
					};
				},
			},
			0,
		);
	});

	afterEach(() => {
		fs.purge();
	});

	it("should join accesses", (done) => {
		fs.realpath("a", (err, result) => {
			expect(result).toBeDefined();
			result.a = true;
		});
		fs.realpath("a", (err, result) => {
			expect(result).toBeDefined();
			expect(result.a).toBeDefined();
			done();
		});
	});

	it("should not join accesses with options", (done) => {
		fs.realpath("a", (err, result) => {
			expect(result).toBeDefined();

			result.a = true;

			expect(result).toBeDefined();
			expect(result.path).toBe("a");
			expect(result.options).toBeUndefined();
		});
		fs.realpath("a", { options: true }, (err, result) => {
			expect(result).toBeDefined();
			expect(result.a).toBeUndefined();
			expect(result.path).toBe("a");
			expect(result.options).toMatchObject({ options: true });
			done();
		});
	});

	it("should not cache accesses", (done) => {
		fs.realpath("a", (err, result) => {
			result.a = true;
			fs.realpath("a", (err, result) => {
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

describe("cachedInputFileSystem CacheBackend", () => {
	let fs;

	beforeEach(() => {
		let counter = 0;
		fs = new CachedInputFileSystem(
			{
				stat(path, options, callback) {
					if (!callback) {
						callback = options;
						options = undefined;
					}
					setTimeout(
						callback.bind(null, null, {
							path,
							options,
						}),
						100,
					);
				},
				// @ts-expect-error for tests
				statSync(path, options) {
					return {
						path,
						options,
					};
				},
				readdir(path, callback) {
					callback(null, [`${counter++}`]);
				},
			},
			1000,
		);
	});

	afterEach(() => {
		fs.purge();
	});

	it("should join accesses", (done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
		});
		fs.stat("a", (err, result) => {
			expect(result.a).toBeDefined();
			done();
		});
	});

	it("should not call callback twice when combining sync and async calls", (done) => {
		let called = false;
		fs.stat("a", (err, result) => {
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

	it("should not join accesses with options", (done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			expect(result.path).toBe("a");
			expect(result.options).toBeUndefined();
		});
		fs.stat("a", { options: true }, (err, result) => {
			expect(result.a).toBeUndefined();
			expect(result.path).toBe("a");
			expect(result.options).toMatchObject({ options: true });
			done();
		});
	});

	it("should cache accesses", (done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			let sync = true;
			fs.stat("a", (err, result) => {
				expect(result.a).toBeDefined();
				expect(sync).toBe(true);
				setTimeout(() => {
					fs.stat("a", (err, result) => {
						expect(result.a).toBeUndefined();
						result.b = true;
						let sync2 = true;
						fs.stat("a", (err, result) => {
							expect(result.b).toBeDefined();
							expect(result.a).toBeUndefined();
							expect(sync2).toBe(true);
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

	it("should recover after passive periods", (done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			setTimeout(() => {
				fs.stat("a", (err, result) => {
					expect(result.a).toBeDefined();
					setTimeout(() => {
						fs.stat("a", (err, result) => {
							expect(result.a).toBeUndefined();
							result.b = true;
							setTimeout(() => {
								fs.stat("a", (err, result) => {
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

	it("should restart after timeout", (done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			setTimeout(() => {
				fs.stat("a", (err, result) => {
					expect(result.a).toBeUndefined();
					result.b = true;
					setTimeout(() => {
						fs.stat("a", (err, result) => {
							expect(result.b).toBeDefined();
							expect(result.a).toBeUndefined();
							done();
						});
					}, 50);
				});
			}, 1100);
		});
	});

	it("should cache undefined value", (done) => {
		fs.stat(undefined, (_err, result) => {
			expect(result).toBeUndefined();
			fs.purge("a");
			fs.purge();
			done();
		});
	});

	it("should purge readdir correctly", (done) => {
		fs.readdir("/test/path", (err, r) => {
			expect(r[0]).toBe("0");
			fs.purge(["/test/path/sub/path"]);
			fs.readdir("/test/path", (err, r) => {
				expect(r[0]).toBe("0");
				fs.purge(["/test/path/sub"]);
				fs.readdir("/test/path", (err, r) => {
					expect(r[0]).toBe("1");
					fs.purge(["/test/path"]);
					fs.readdir("/test/path", (err, r) => {
						expect(r[0]).toBe("2");
						fs.purge([url.pathToFileURL("/test/path")]);
						fs.readdir("/test/path", (err, r) => {
							expect(r[0]).toBe("2");
							fs.purge(Buffer.from("/test/path"));
							fs.readdir("/test/path", (err, r) => {
								expect(r[0]).toBe("3");
								fs.purge([Buffer.from("/test/path")]);
								fs.readdir("/test/path", (err, r) => {
									expect(r[0]).toBe("4");
									done();
								});
							});
						});
					});
				});
			});
		});
	});

	it("should purge exact entries only when exact: true", (done) => {
		fs.stat("/test/path", (err, r1) => {
			expect(r1.path).toBe("/test/path");
			r1.cached = true;
			fs.stat("/test/path/sub", (err, r2) => {
				expect(r2.path).toBe("/test/path/sub");
				r2.cached = true;
				// Prefix purge with exact: true should NOT remove the child entry
				fs.purge("/test/path", { exact: true });
				fs.stat("/test/path", (err, r3) => {
					// /test/path was the exact match, should be re-fetched (cached flag gone)
					expect(r3.cached).toBeUndefined();
					fs.stat("/test/path/sub", (err, r4) => {
						// /test/path/sub should still be cached
						expect(r4.cached).toBe(true);
						done();
					});
				});
			});
		});
	});

	it("should purge an array exactly when exact: true", (done) => {
		fs.stat("/test/path", (err, r1) => {
			r1.cached = true;
			fs.stat("/test/path/sub", (err, r2) => {
				r2.cached = true;
				fs.stat("/other", (err, r3) => {
					r3.cached = true;
					fs.purge(["/test/path", "/other"], { exact: true });
					fs.stat("/test/path", (err, r4) => {
						expect(r4.cached).toBeUndefined();
						fs.stat("/test/path/sub", (err, r5) => {
							expect(r5.cached).toBe(true);
							fs.stat("/other", (err, r6) => {
								expect(r6.cached).toBeUndefined();
								done();
							});
						});
					});
				});
			});
		});
	});

	it("should still prefix-purge when exact is not set or false", (done) => {
		fs.stat("/test/path", (err, r1) => {
			r1.cached = true;
			fs.stat("/test/path/sub", (err, r2) => {
				r2.cached = true;
				fs.purge("/test/path");
				fs.stat("/test/path", (err, r3) => {
					expect(r3.cached).toBeUndefined();
					fs.stat("/test/path/sub", (err, r4) => {
						expect(r4.cached).toBeUndefined();
						done();
					});
				});
			});
		});
	});

	it("should purge readdir of the exact directory when exact: true", (done) => {
		fs.readdir("/test/path", (err, r1) => {
			expect(r1[0]).toBe("0");
			fs.readdir("/test/path/sub", (err, r2) => {
				expect(r2[0]).toBe("1");
				// Without exact, purging the dir path strips to dirname and prefix-purges
				// readdir for that parent — meaning readdir("/test/path") would NOT be evicted
				// by purge("/test/path/sub") in legacy mode (parent is "/test/path/", child of
				// which is "/test/path/sub", but readdir key is "/test/path"). With exact: true
				// the caller is naming the directory itself, so it should evict directly.
				fs.purge("/test/path", { exact: true });
				fs.readdir("/test/path", (err, r3) => {
					expect(r3[0]).toBe("2");
					// sibling readdir cache should still be intact
					fs.readdir("/test/path/sub", (err, r4) => {
						expect(r4[0]).toBe("1");
						done();
					});
				});
			});
		});
	});

	it("should accept Buffer with exact: true", (done) => {
		fs.stat("/test/path", (err, r1) => {
			r1.cached = true;
			fs.stat("/test/path/sub", (err, r2) => {
				r2.cached = true;
				fs.purge(Buffer.from("/test/path"), { exact: true });
				fs.stat("/test/path", (err, r3) => {
					expect(r3.cached).toBeUndefined();
					fs.stat("/test/path/sub", (err, r4) => {
						expect(r4.cached).toBe(true);
						fs.purge([Buffer.from("/test/path/sub")], {
							exact: true,
						});
						fs.stat("/test/path/sub", (err, r5) => {
							expect(r5.cached).toBeUndefined();
							done();
						});
					});
				});
			});
		});
	});

	it("should not stack overflow when resolving in an async loop", (done) => {
		let i = 10000;
		const next = () => {
			fs.stat(__dirname, (_err, result) => {
				expect(result).toBeDefined();
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

describe("cachedInputFileSystem CacheBackend with Infinity duration", () => {
	let fs;

	beforeEach(() => {
		fs = new CachedInputFileSystem(
			{
				stat(path, options, callback) {
					if (!callback) {
						callback = options;
						options = undefined;
					}
					setTimeout(
						callback.bind(null, null, {
							path,
							options,
						}),
						100,
					);
				},
				// @ts-expect-error for tests
				statSync(path, options) {
					return {
						path,
						options,
					};
				},
			},
			Infinity,
		);
	});

	afterEach(() => {
		fs.purge();
	});

	it("should not crash the constructor with Infinity", () => {
		expect(fs).toBeDefined();
	});

	it("should cache accesses forever", (done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			fs.stat("a", (err, result) => {
				expect(result.a).toBeDefined();
				setTimeout(() => {
					fs.stat("a", (err, result) => {
						expect(result.a).toBeDefined();
						done();
					});
				}, 100);
			});
		});
	});

	it("should cache sync accesses forever", () => {
		const result = fs.statSync("a");
		result.a = true;
		const result2 = fs.statSync("a");
		expect(result2.a).toBeDefined();
	});
});

describe("cachedInputFileSystem CacheBackend and Node.JS filesystem", () => {
	let fs;

	beforeEach(() => {
		fs = new CachedInputFileSystem(require("fs"), 1);
	});

	const file = path.resolve(__dirname, "./fixtures/abc.txt");

	it("should work with string async", (done) => {
		fs.readFile(file, (err, r) => {
			if (err) {
				done(err);
				return;
			}
			expect(r.toString()).toBe("abc");
			done();
		});
	});

	it("should work with string sync", () => {
		const r = fs.readFileSync(file);
		expect(r.toString()).toBe("abc");
	});

	it("should work with Buffer async", (done) => {
		fs.readFile(Buffer.from(file), (err, r) => {
			if (err) {
				done(err);
				return;
			}
			expect(r.toString()).toBe("abc");
			done();
		});
	});

	it("should work with Buffer sync", () => {
		const r = fs.readFileSync(Buffer.from(file));
		expect(r.toString()).toBe("abc");
	});

	it("should work with URL async", (done) => {
		fs.readFile(url.pathToFileURL(file), (err, r) => {
			if (err) {
				done(err);
				return;
			}
			expect(r.toString()).toBe("abc");
			done();
		});
	});

	it("should work with URL sync", () => {
		const r = fs.readFileSync(url.pathToFileURL(file));
		expect(r.toString()).toBe("abc");
	});
});

describe("cachedInputFileSystem OperationMergerBackend and Node.JS filesystem", () => {
	let fs;

	beforeEach(() => {
		fs = new CachedInputFileSystem(require("fs"), 0);
	});

	const file = path.resolve(__dirname, "./fixtures/abc.txt");

	it("should work with string async", (done) => {
		fs.readFile(file, (err, r) => {
			if (err) {
				done(err);
				return;
			}
			expect(r.toString()).toBe("abc");
			done();
		});
	});

	it("should work with string sync", () => {
		const r = fs.readFileSync(file);
		expect(r.toString()).toBe("abc");
	});

	it("should work with Buffer async", (done) => {
		fs.readFile(Buffer.from(file), (err, r) => {
			if (err) {
				done(err);
				return;
			}
			expect(r.toString()).toBe("abc");
			done();
		});
	});

	it("should work with Buffer sync", () => {
		const r = fs.readFileSync(Buffer.from(file));
		expect(r.toString()).toBe("abc");
	});

	it("should work with URL async", (done) => {
		fs.readFile(url.pathToFileURL(file), (err, r) => {
			if (err) {
				done(err);
				return;
			}
			expect(r.toString()).toBe("abc");
			done();
		});
	});

	it("should work with URL sync", () => {
		const r = fs.readFileSync(url.pathToFileURL(file));
		expect(r.toString()).toBe("abc");
	});
});
