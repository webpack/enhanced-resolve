const path = require("path");
const fs = require("fs");
const { platform } = require("os");
const resolve = require("../");
const { obps } = require("./util/path-separator");

const tempPath = path.join(__dirname, "temp");

describe("symlink", () => {
	let isAdmin = true;
	try {
		fs.mkdirSync(tempPath);
		fs.symlinkSync(
			path.join(__dirname, "..", "lib", "index.js"),
			path.join(tempPath, "test"),
			"file"
		);
		fs.symlinkSync(
			path.join(__dirname, "..", "lib"),
			path.join(tempPath, "test2"),
			"dir"
		);
	} catch (e) {
		isAdmin = false;
	}
	try {
		fs.unlinkSync(path.join(tempPath, "test"));
	} catch (e) {
		isAdmin = false;
	}
	try {
		fs.unlinkSync(path.join(tempPath, "test2"));
	} catch (e) {
		isAdmin = false;
	}
	try {
		fs.rmdirSync(tempPath);
	} catch (e) {
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
					"file"
				);
				fs.symlinkSync(
					path.join(__dirname, "..", "lib"),
					path.join(tempPath, "lib"),
					"dir"
				);
				fs.symlinkSync(
					path.join(__dirname, ".."),
					path.join(tempPath, "this"),
					"dir"
				);
				fs.symlinkSync(
					path.join(tempPath, "this"),
					path.join(tempPath, "that"),
					"dir"
				);
				fs.symlinkSync(
					path.join("..", "..", "lib", "index.js"),
					path.join(tempPath, "node.relative.js"),
					"file"
				);
				fs.symlinkSync(
					path.join(".", "node.relative.js"),
					path.join(tempPath, "node.relative.sym.js"),
					"file"
				);
				// PR #150: Set the current working directory so that tests will fail if changes get reverted.
				if (isWindows) {
					process.chdir(path.join(tempPath, "that"));
				}
			} catch (e) {
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
			symlinks: false
		});
		const resolveSyncWithoutSymlinks = resolve.create.sync({
			symlinks: false
		});

		[
			[tempPath, `.${obps}index.js`, "with a symlink to a file"],
			[
				tempPath,
				`.${obps}node.relative.js`,
				"with a relative symlink to a file"
			],
			[
				tempPath,
				`.${obps}node.relative.sym.js`,
				"with a relative symlink to a symlink to a file"
			],
			[
				tempPath,
				`.${obps}lib${obps}index.js`,
				"with a symlink to a directory 1"
			],
			[
				tempPath,
				`.${obps}this${obps}lib${obps}index.js`,
				"with a symlink to a directory 2"
			],
			[
				tempPath,
				`.${obps}this${obps}test${obps}temp${obps}index.js`,
				"with multiple symlinks in the path 1"
			],
			[
				tempPath,
				`.${obps}this${obps}test${obps}temp${obps}lib${obps}index.js`,
				"with multiple symlinks in the path 2"
			],
			[
				tempPath,
				`.${obps}this${obps}test${obps}temp${obps}this${obps}lib${obps}index.js`,
				"with multiple symlinks in the path 3"
			],
			[
				tempPath,
				`.${obps}that${obps}lib${obps}index.js`,
				"with a symlink to a directory 2 (chained)"
			],
			[
				tempPath,
				`.${obps}that${obps}test${obps}temp${obps}index.js`,
				"with multiple symlinks in the path 1 (chained)"
			],
			[
				tempPath,
				`.${obps}that${obps}test${obps}temp${obps}lib${obps}index.js`,
				"with multiple symlinks in the path 2 (chained)"
			],
			[
				tempPath,
				`.${obps}that${obps}test${obps}temp${obps}that${obps}lib${obps}index.js`,
				"with multiple symlinks in the path 3 (chained)"
			],
			[
				path.join(tempPath, "lib"),
				`.${obps}index.js`,
				"with symlinked directory as context 1"
			],
			[
				path.join(tempPath, "this"),
				`.${obps}lib${obps}index.js`,
				"with symlinked directory as context 2"
			],
			[
				path.join(tempPath, "this"),
				`.${obps}test${obps}temp${obps}lib${obps}index.js`,
				"with symlinked directory as context and in path"
			],
			[
				path.join(tempPath, "this", "lib"),
				`.${obps}index.js`,
				"with symlinked directory in context path"
			],
			[
				path.join(tempPath, "this", "test"),
				`.${obps}temp${obps}index.js`,
				"with symlinked directory in context path and symlinked file"
			],
			[
				path.join(tempPath, "this", "test"),
				`.${obps}temp${obps}lib${obps}index.js`,
				"with symlinked directory in context path and symlinked directory"
			],
			[
				path.join(tempPath, "that"),
				`.${obps}lib${obps}index.js`,
				"with symlinked directory as context 2 (chained)"
			],
			[
				path.join(tempPath, "that"),
				`.${obps}test${obps}temp${obps}lib${obps}index.js`,
				"with symlinked directory as context and in path (chained)"
			],
			[
				path.join(tempPath, "that", "lib"),
				`.${obps}index.js`,
				"with symlinked directory in context path (chained)"
			],
			[
				path.join(tempPath, "that", "test"),
				`.${obps}temp${obps}index.js`,
				"with symlinked directory in context path and symlinked file (chained)"
			],
			[
				path.join(tempPath, "that", "test"),
				`.${obps}temp${obps}lib${obps}index.js`,
				"with symlinked directory in context path and symlinked directory (chained)"
			]
		].forEach(function (pathToIt) {
			it("should resolve symlink to itself " + pathToIt[2], function (done) {
				resolve(pathToIt[0], pathToIt[1], function (err, filename) {
					if (err) return done(err);
					expect(filename).toBeDefined();
					expect(typeof filename).toBe("string");
					expect(filename).toEqual(
						path.join(__dirname, "..", "lib", "index.js")
					);

					resolveWithoutSymlinks(
						pathToIt[0],
						pathToIt[1],
						function (err, filename) {
							if (err) return done(err);
							expect(typeof filename).toBe("string");
							expect(filename).toEqual(path.resolve(pathToIt[0], pathToIt[1]));
							done();
						}
					);
				});
			});
			it("should resolve symlink to itself sync " + pathToIt[2], () => {
				let filename = resolve.sync(pathToIt[0], pathToIt[1]);
				expect(filename).toBeDefined();
				expect(typeof filename).toBe("string");
				expect(filename).toEqual(path.join(__dirname, "..", "lib", "index.js"));

				filename = resolveSyncWithoutSymlinks(pathToIt[0], pathToIt[1]);

				expect(typeof filename).toBe("string");
				expect(filename).toEqual(path.resolve(pathToIt[0], pathToIt[1]));
			});
		});
	} else {
		it("cannot test symlinks because we have no permission to create them", () => {});
	}
});
