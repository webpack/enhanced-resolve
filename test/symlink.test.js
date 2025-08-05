"use strict";

const fs = require("fs");
const { platform } = require("os");
const path = require("path");
const resolve = require("../");

const tempPath = path.join(__dirname, "temp");

describe("symlink", () => {
	let isAdmin = true;
	try {
		fs.mkdirSync(tempPath);
		fs.symlinkSync(
			path.join(__dirname, "..", "lib", "index.js"),
			path.join(tempPath, "test"),
			"file",
		);
		fs.symlinkSync(
			path.join(__dirname, "..", "lib"),
			path.join(tempPath, "test2"),
			"dir",
		);
	} catch (_err) {
		isAdmin = false;
	}
	try {
		fs.unlinkSync(path.join(tempPath, "test"));
	} catch (_err) {
		isAdmin = false;
	}
	try {
		fs.unlinkSync(path.join(tempPath, "test2"));
	} catch (_err) {
		isAdmin = false;
	}
	try {
		fs.rmdirSync(tempPath);
	} catch (_err) {
		isAdmin = false;
	}

	if (isAdmin) {
		// PR #150: Detect Windows and preserve current working directory.
		const isWindows = platform() === "win32";
		const oldCWD = (isWindows && process.cwd()) || "";

		beforeEach(() => {
			// Create some cool symlinks
			try {
				fs.mkdirSync(tempPath);
				fs.symlinkSync(
					path.join(__dirname, "..", "lib", "index.js"),
					path.join(tempPath, "index.js"),
					"file",
				);
				fs.symlinkSync(
					path.join(__dirname, "..", "lib"),
					path.join(tempPath, "lib"),
					"dir",
				);
				fs.symlinkSync(
					path.join(__dirname, ".."),
					path.join(tempPath, "this"),
					"dir",
				);
				fs.symlinkSync(
					path.join(tempPath, "this"),
					path.join(tempPath, "that"),
					"dir",
				);
				fs.symlinkSync(
					path.join("..", "..", "lib", "index.js"),
					path.join(tempPath, "node.relative.js"),
					"file",
				);
				fs.symlinkSync(
					path.join(".", "node.relative.js"),
					path.join(tempPath, "node.relative.sym.js"),
					"file",
				);
				// PR #150: Set the current working directory so that tests will fail if changes get reverted.
				if (isWindows) {
					process.chdir(path.join(tempPath, "that"));
				}
			} catch (_err) {
				// ignore the failure
			}
		});

		afterEach(() => {
			// PR #150: Restore the original working directory.
			if (isWindows) {
				process.chdir(oldCWD);
			}
			fs.unlinkSync(path.join(tempPath, "index.js"));
			fs.unlinkSync(path.join(tempPath, "node.relative.js"));
			fs.unlinkSync(path.join(tempPath, "node.relative.sym.js"));
			fs.unlinkSync(path.join(tempPath, "lib"));
			fs.unlinkSync(path.join(tempPath, "this"));
			fs.unlinkSync(path.join(tempPath, "that"));
			fs.rmdirSync(tempPath);
		});

		const resolveWithoutSymlinks = resolve.create({
			symlinks: false,
		});
		const resolveSyncWithoutSymlinks = resolve.create.sync({
			symlinks: false,
		});

		for (const pathToIt of [
			[tempPath, "./index.js", "with a symlink to a file"],
			[tempPath, "./node.relative.js", "with a relative symlink to a file"],
			[
				tempPath,
				"./node.relative.sym.js",
				"with a relative symlink to a symlink to a file",
			],
			[tempPath, "./lib/index.js", "with a symlink to a directory 1"],
			[tempPath, "./this/lib/index.js", "with a symlink to a directory 2"],
			[
				tempPath,
				"./this/test/temp/index.js",
				"with multiple symlinks in the path 1",
			],
			[
				tempPath,
				"./this/test/temp/lib/index.js",
				"with multiple symlinks in the path 2",
			],
			[
				tempPath,
				"./this/test/temp/this/lib/index.js",
				"with multiple symlinks in the path 3",
			],
			[
				tempPath,
				"./that/lib/index.js",
				"with a symlink to a directory 2 (chained)",
			],
			[
				tempPath,
				"./that/test/temp/index.js",
				"with multiple symlinks in the path 1 (chained)",
			],
			[
				tempPath,
				"./that/test/temp/lib/index.js",
				"with multiple symlinks in the path 2 (chained)",
			],
			[
				tempPath,
				"./that/test/temp/that/lib/index.js",
				"with multiple symlinks in the path 3 (chained)",
			],
			[
				path.join(tempPath, "lib"),
				"./index.js",
				"with symlinked directory as context 1",
			],
			[
				path.join(tempPath, "this"),
				"./lib/index.js",
				"with symlinked directory as context 2",
			],
			[
				path.join(tempPath, "this"),
				"./test/temp/lib/index.js",
				"with symlinked directory as context and in path",
			],
			[
				path.join(tempPath, "this", "lib"),
				"./index.js",
				"with symlinked directory in context path",
			],
			[
				path.join(tempPath, "this", "test"),
				"./temp/index.js",
				"with symlinked directory in context path and symlinked file",
			],
			[
				path.join(tempPath, "this", "test"),
				"./temp/lib/index.js",
				"with symlinked directory in context path and symlinked directory",
			],
			[
				path.join(tempPath, "that"),
				"./lib/index.js",
				"with symlinked directory as context 2 (chained)",
			],
			[
				path.join(tempPath, "that"),
				"./test/temp/lib/index.js",
				"with symlinked directory as context and in path (chained)",
			],
			[
				path.join(tempPath, "that", "lib"),
				"./index.js",
				"with symlinked directory in context path (chained)",
			],
			[
				path.join(tempPath, "that", "test"),
				"./temp/index.js",
				"with symlinked directory in context path and symlinked file (chained)",
			],
			[
				path.join(tempPath, "that", "test"),
				"./temp/lib/index.js",
				"with symlinked directory in context path and symlinked directory (chained)",
			],
		]) {
			it(`should resolve symlink to itself ${pathToIt[2]}`, (done) => {
				resolve(pathToIt[0], pathToIt[1], (err, filename) => {
					if (err) return done(err);
					expect(filename).toBeDefined();
					expect(typeof filename).toBe("string");
					expect(filename).toEqual(
						path.join(__dirname, "..", "lib", "index.js"),
					);

					resolveWithoutSymlinks(pathToIt[0], pathToIt[1], (err, filename) => {
						if (err) return done(err);
						expect(typeof filename).toBe("string");
						expect(filename).toEqual(path.resolve(pathToIt[0], pathToIt[1]));
						done();
					});
				});
			});

			it(`should resolve symlink to itself sync ${pathToIt[2]}`, () => {
				let filename = resolve.sync(pathToIt[0], pathToIt[1]);
				expect(filename).toBeDefined();
				expect(typeof filename).toBe("string");
				expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));

				filename = resolveSyncWithoutSymlinks(pathToIt[0], pathToIt[1]);

				expect(typeof filename).toBe("string");
				expect(filename).toEqual(path.resolve(pathToIt[0], pathToIt[1]));
			});
		}
	} else {
		// eslint-disable-next-line jest/expect-expect
		it("cannot test symlinks because we have no permission to create them", () => {
			// Nothing
		});
	}
});
