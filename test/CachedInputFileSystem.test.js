"use strict";

const assert = require("assert");

const path = require("path");
const url = require("url");
const { CachedInputFileSystem } = require("../");
const { afterEach, beforeEach, describe, it } = require("./_runner");

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

	it("should join accesses", (t, done) => {
		fs.stat("a", (err, result) => {
			assert.notStrictEqual(result, undefined);
			result.a = true;
		});
		fs.stat("a", (err, result) => {
			assert.notStrictEqual(result, undefined);
			assert.notStrictEqual(result.a, undefined);
			done();
		});
	});

	it("should not join accesses with options", (t, done) => {
		fs.stat("a", (err, result) => {
			assert.notStrictEqual(result, undefined);
			result.a = true;
			assert.strictEqual(result.path, "a");
			assert.strictEqual(result.options, undefined);
		});
		fs.stat("a", { options: true }, (err, result) => {
			assert.notStrictEqual(result, undefined);
			assert.strictEqual(result.a, undefined);
			assert.strictEqual(result.path, "a");
			assert.strictEqual(result.options.options, true);
			done();
		});
	});

	it("should not cache accesses", (t, done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			fs.stat("a", (err, result) => {
				assert.strictEqual(result.a, undefined);
				done();
			});
		});
	});

	it("should not cache sync accesses", () => {
		const result = fs.statSync("a");
		result.a = true;
		const result2 = fs.statSync("a");

		assert.strictEqual(result2.a, undefined);
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

	it("should join accesses", (t, done) => {
		fs.lstat("a", (err, result) => {
			assert.notStrictEqual(result, undefined);
			result.a = true;
		});
		fs.lstat("a", (err, result) => {
			assert.notStrictEqual(result, undefined);
			assert.notStrictEqual(result.a, undefined);
			done();
		});
	});

	it("should not join accesses with options", (t, done) => {
		fs.lstat("a", (err, result) => {
			assert.notStrictEqual(result, undefined);

			result.a = true;

			assert.notStrictEqual(result, undefined);
			assert.strictEqual(result.path, "a");
			assert.strictEqual(result.options, undefined);
		});
		fs.lstat("a", { options: true }, (err, result) => {
			assert.notStrictEqual(result, undefined);
			assert.strictEqual(result.a, undefined);
			assert.strictEqual(result.path, "a");
			assert.strictEqual(result.options.options, true);
			done();
		});
	});

	it("should not cache accesses", (t, done) => {
		fs.lstat("a", (err, result) => {
			result.a = true;
			fs.lstat("a", (err, result) => {
				assert.strictEqual(result.a, undefined);
				done();
			});
		});
	});

	it("should not cache sync accesses", () => {
		const result = fs.lstatSync("a");
		result.a = true;
		const result2 = fs.lstatSync("a");

		assert.strictEqual(result2.a, undefined);
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

	it("should join accesses", (t, done) => {
		fs.realpath("a", (err, result) => {
			assert.notStrictEqual(result, undefined);
			result.a = true;
		});
		fs.realpath("a", (err, result) => {
			assert.notStrictEqual(result, undefined);
			assert.notStrictEqual(result.a, undefined);
			done();
		});
	});

	it("should not join accesses with options", (t, done) => {
		fs.realpath("a", (err, result) => {
			assert.notStrictEqual(result, undefined);

			result.a = true;

			assert.notStrictEqual(result, undefined);
			assert.strictEqual(result.path, "a");
			assert.strictEqual(result.options, undefined);
		});
		fs.realpath("a", { options: true }, (err, result) => {
			assert.notStrictEqual(result, undefined);
			assert.strictEqual(result.a, undefined);
			assert.strictEqual(result.path, "a");
			assert.strictEqual(result.options.options, true);
			done();
		});
	});

	it("should not cache accesses", (t, done) => {
		fs.realpath("a", (err, result) => {
			result.a = true;
			fs.realpath("a", (err, result) => {
				assert.strictEqual(result.a, undefined);
				done();
			});
		});
	});

	it("should not cache sync accesses", () => {
		const result = fs.realpathSync("a");
		result.a = true;
		const result2 = fs.realpathSync("a");

		assert.strictEqual(result2.a, undefined);
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

	it("should join accesses", (t, done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
		});
		fs.stat("a", (err, result) => {
			assert.notStrictEqual(result.a, undefined);
			done();
		});
	});

	it("should not call callback twice when combining sync and async calls", (t, done) => {
		let called = false;
		fs.stat("a", (err, result) => {
			if (called) return done(new Error("callback was called twice"));
			called = true;
			assert.notStrictEqual(result, undefined);
			result.a = true;
			done();
		});
		const syncResult = fs.statSync("a");

		assert.notStrictEqual(syncResult, undefined);
		assert.notStrictEqual(syncResult.a, undefined);
	});

	it("should not join accesses with options", (t, done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			assert.strictEqual(result.path, "a");
			assert.strictEqual(result.options, undefined);
		});
		fs.stat("a", { options: true }, (err, result) => {
			assert.strictEqual(result.a, undefined);
			assert.strictEqual(result.path, "a");
			assert.strictEqual(result.options.options, true);
			done();
		});
	});

	it("should cache accesses", (t, done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			let sync = true;
			fs.stat("a", (err, result) => {
				assert.notStrictEqual(result.a, undefined);
				assert.strictEqual(sync, true);
				setTimeout(() => {
					fs.stat("a", (err, result) => {
						assert.strictEqual(result.a, undefined);
						result.b = true;
						let sync2 = true;
						fs.stat("a", (err, result) => {
							assert.notStrictEqual(result.b, undefined);
							assert.strictEqual(result.a, undefined);
							assert.strictEqual(sync2, true);
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
		assert.notStrictEqual(result2.a, undefined);
		const result3 = fs.statSync("a", { options: true });
		assert.strictEqual(result3.a, undefined);
		assert.strictEqual(result3.options.options, true);
	});

	it("should recover after passive periods", (t, done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			setTimeout(() => {
				fs.stat("a", (err, result) => {
					assert.notStrictEqual(result.a, undefined);
					setTimeout(() => {
						fs.stat("a", (err, result) => {
							assert.strictEqual(result.a, undefined);
							result.b = true;
							setTimeout(() => {
								fs.stat("a", (err, result) => {
									assert.notStrictEqual(result.b, undefined);
									assert.strictEqual(result.a, undefined);
									done();
								});
							}, 500);
						});
					}, 600);
				});
			}, 500);
		});
	});

	it("should restart after timeout", (t, done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			setTimeout(() => {
				fs.stat("a", (err, result) => {
					assert.strictEqual(result.a, undefined);
					result.b = true;
					setTimeout(() => {
						fs.stat("a", (err, result) => {
							assert.notStrictEqual(result.b, undefined);
							assert.strictEqual(result.a, undefined);
							done();
						});
					}, 50);
				});
			}, 1100);
		});
	});

	it("should cache undefined value", (t, done) => {
		fs.stat(undefined, (_err, result) => {
			assert.strictEqual(result, undefined);
			fs.purge("a");
			fs.purge();
			done();
		});
	});

	it("should purge readdir correctly", (t, done) => {
		fs.readdir("/test/path", (err, r) => {
			assert.strictEqual(r[0], "0");
			fs.purge(["/test/path/sub/path"]);
			fs.readdir("/test/path", (err, r) => {
				assert.strictEqual(r[0], "0");
				fs.purge(["/test/path/sub"]);
				fs.readdir("/test/path", (err, r) => {
					assert.strictEqual(r[0], "1");
					fs.purge(["/test/path"]);
					fs.readdir("/test/path", (err, r) => {
						assert.strictEqual(r[0], "2");
						fs.purge([url.pathToFileURL("/test/path")]);
						fs.readdir("/test/path", (err, r) => {
							assert.strictEqual(r[0], "2");
							fs.purge(Buffer.from("/test/path"));
							fs.readdir("/test/path", (err, r) => {
								assert.strictEqual(r[0], "3");
								fs.purge([Buffer.from("/test/path")]);
								fs.readdir("/test/path", (err, r) => {
									assert.strictEqual(r[0], "4");
									done();
								});
							});
						});
					});
				});
			});
		});
	});

	it("should not clear the entire cache when purging falsy keys 0 or ''", (t, done) => {
		// number 0 (a valid fd) and "" are valid cache keys per the signature;
		// passing them must not be confused with the no-arg "clear all" form.
		fs.stat("/test/path", (err, r1) => {
			r1.cached = true;
			fs.purge(0);
			fs.stat("/test/path", (err, r2) => {
				assert.strictEqual(r2.cached, true);
				fs.purge("");
				fs.stat("/test/path", (err, r3) => {
					// Empty string is a prefix of every key, so prefix-purge still clears
					// everything — but only because of the prefix semantics, not because
					// "" was misclassified as "no argument".
					assert.strictEqual(r3.cached, undefined);
					done();
				});
			});
		});
	});

	it("should not crash when options is null", (t, done) => {
		fs.stat("/test/path", (err, r1) => {
			r1.cached = true;
			assert.doesNotThrow(() => fs.purge("/test/path", null));
			fs.stat("/test/path", (err, r2) => {
				// null is treated as "no options" — falls back to prefix purge
				assert.strictEqual(r2.cached, undefined);
				done();
			});
		});
	});

	it("should purge exact entries only when exact: true", (t, done) => {
		fs.stat("/test/path", (err, r1) => {
			assert.strictEqual(r1.path, "/test/path");
			r1.cached = true;
			fs.stat("/test/path/sub", (err, r2) => {
				assert.strictEqual(r2.path, "/test/path/sub");
				r2.cached = true;
				// Prefix purge with exact: true should NOT remove the child entry
				fs.purge("/test/path", { exact: true });
				fs.stat("/test/path", (err, r3) => {
					// /test/path was the exact match, should be re-fetched (cached flag gone)
					assert.strictEqual(r3.cached, undefined);
					fs.stat("/test/path/sub", (err, r4) => {
						// /test/path/sub should still be cached
						assert.strictEqual(r4.cached, true);
						done();
					});
				});
			});
		});
	});

	it("should purge an array exactly when exact: true", (t, done) => {
		fs.stat("/test/path", (err, r1) => {
			r1.cached = true;
			fs.stat("/test/path/sub", (err, r2) => {
				r2.cached = true;
				fs.stat("/other", (err, r3) => {
					r3.cached = true;
					fs.purge(["/test/path", "/other"], { exact: true });
					fs.stat("/test/path", (err, r4) => {
						assert.strictEqual(r4.cached, undefined);
						fs.stat("/test/path/sub", (err, r5) => {
							assert.strictEqual(r5.cached, true);
							fs.stat("/other", (err, r6) => {
								assert.strictEqual(r6.cached, undefined);
								done();
							});
						});
					});
				});
			});
		});
	});

	it("should still prefix-purge when exact is not set or false", (t, done) => {
		fs.stat("/test/path", (err, r1) => {
			r1.cached = true;
			fs.stat("/test/path/sub", (err, r2) => {
				r2.cached = true;
				fs.purge("/test/path");
				fs.stat("/test/path", (err, r3) => {
					assert.strictEqual(r3.cached, undefined);
					fs.stat("/test/path/sub", (err, r4) => {
						assert.strictEqual(r4.cached, undefined);
						done();
					});
				});
			});
		});
	});

	it("should purge readdir of the exact directory when exact: true", (t, done) => {
		fs.readdir("/test/path", (err, r1) => {
			assert.strictEqual(r1[0], "0");
			fs.readdir("/test/path/sub", (err, r2) => {
				assert.strictEqual(r2[0], "1");
				// Without exact, purging the dir path strips to dirname and prefix-purges
				// readdir for that parent — meaning readdir("/test/path") would NOT be evicted
				// by purge("/test/path/sub") in legacy mode (parent is "/test/path/", child of
				// which is "/test/path/sub", but readdir key is "/test/path"). With exact: true
				// the caller is naming the directory itself, so it should evict directly.
				fs.purge("/test/path", { exact: true });
				fs.readdir("/test/path", (err, r3) => {
					assert.strictEqual(r3[0], "2");
					// sibling readdir cache should still be intact
					fs.readdir("/test/path/sub", (err, r4) => {
						assert.strictEqual(r4[0], "1");
						done();
					});
				});
			});
		});
	});

	it("should accept Buffer with exact: true", (t, done) => {
		fs.stat("/test/path", (err, r1) => {
			r1.cached = true;
			fs.stat("/test/path/sub", (err, r2) => {
				r2.cached = true;
				fs.purge(Buffer.from("/test/path"), { exact: true });
				fs.stat("/test/path", (err, r3) => {
					assert.strictEqual(r3.cached, undefined);
					fs.stat("/test/path/sub", (err, r4) => {
						assert.strictEqual(r4.cached, true);
						fs.purge([Buffer.from("/test/path/sub")], {
							exact: true,
						});
						fs.stat("/test/path/sub", (err, r5) => {
							assert.strictEqual(r5.cached, undefined);
							done();
						});
					});
				});
			});
		});
	});

	it("should not stack overflow when resolving in an async loop", (t, done) => {
		let i = 10000;
		const next = () => {
			fs.stat(__dirname, (_err, result) => {
				assert.notStrictEqual(result, undefined);
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
		assert.notStrictEqual(fs, undefined);
	});

	it("should cache accesses forever", (t, done) => {
		fs.stat("a", (err, result) => {
			result.a = true;
			fs.stat("a", (err, result) => {
				assert.notStrictEqual(result.a, undefined);
				setTimeout(() => {
					fs.stat("a", (err, result) => {
						assert.notStrictEqual(result.a, undefined);
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
		assert.notStrictEqual(result2.a, undefined);
	});
});

describe("cachedInputFileSystem CacheBackend and Node.JS filesystem", () => {
	let fs;

	beforeEach(() => {
		fs = new CachedInputFileSystem(require("fs"), 1);
	});

	const file = path.resolve(__dirname, "./fixtures/abc.txt");

	it("should work with string async", (t, done) => {
		fs.readFile(file, (err, r) => {
			if (err) {
				done(err);
				return;
			}
			assert.strictEqual(r.toString(), "abc");
			done();
		});
	});

	it("should work with string sync", () => {
		const r = fs.readFileSync(file);
		assert.strictEqual(r.toString(), "abc");
	});

	it("should work with Buffer async", (t, done) => {
		fs.readFile(Buffer.from(file), (err, r) => {
			if (err) {
				done(err);
				return;
			}
			assert.strictEqual(r.toString(), "abc");
			done();
		});
	});

	it("should work with Buffer sync", () => {
		const r = fs.readFileSync(Buffer.from(file));
		assert.strictEqual(r.toString(), "abc");
	});

	it("should work with URL async", (t, done) => {
		fs.readFile(url.pathToFileURL(file), (err, r) => {
			if (err) {
				done(err);
				return;
			}
			assert.strictEqual(r.toString(), "abc");
			done();
		});
	});

	it("should work with URL sync", () => {
		const r = fs.readFileSync(url.pathToFileURL(file));
		assert.strictEqual(r.toString(), "abc");
	});
});

describe("cachedInputFileSystem OperationMergerBackend and Node.JS filesystem", () => {
	let fs;

	beforeEach(() => {
		fs = new CachedInputFileSystem(require("fs"), 0);
	});

	const file = path.resolve(__dirname, "./fixtures/abc.txt");

	it("should work with string async", (t, done) => {
		fs.readFile(file, (err, r) => {
			if (err) {
				done(err);
				return;
			}
			assert.strictEqual(r.toString(), "abc");
			done();
		});
	});

	it("should work with string sync", () => {
		const r = fs.readFileSync(file);
		assert.strictEqual(r.toString(), "abc");
	});

	it("should work with Buffer async", (t, done) => {
		fs.readFile(Buffer.from(file), (err, r) => {
			if (err) {
				done(err);
				return;
			}
			assert.strictEqual(r.toString(), "abc");
			done();
		});
	});

	it("should work with Buffer sync", () => {
		const r = fs.readFileSync(Buffer.from(file));
		assert.strictEqual(r.toString(), "abc");
	});

	it("should work with URL async", (t, done) => {
		fs.readFile(url.pathToFileURL(file), (err, r) => {
			if (err) {
				done(err);
				return;
			}
			assert.strictEqual(r.toString(), "abc");
			done();
		});
	});

	it("should work with URL sync", () => {
		const r = fs.readFileSync(url.pathToFileURL(file));
		assert.strictEqual(r.toString(), "abc");
	});
});
