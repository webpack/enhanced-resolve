"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");
const { AsyncSeriesBailHook } = require("tapable");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ResolverFactory = require("../lib/ResolverFactory");
const RestrictionsPlugin = require("../lib/RestrictionsPlugin");
const { after, describe, it } = require("./_runner");

const fixture = path.resolve(__dirname, "fixtures", "restrictions");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("restrictions", () => {
	it("should respect RegExp restriction", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: [/\.(sass|scss|css)$/],
		});

		resolver.resolve({}, fixture, "pck1", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			assert.ok(err instanceof Error);
			done();
		});
	});

	it("should try to find alternative #1", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js", ".css"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index"],
			restrictions: [/\.(sass|scss|css)$/],
		});

		resolver.resolve({}, fixture, "pck1", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(
				result,
				path.resolve(fixture, "node_modules/pck1/index.css"),
			);
			done();
		});
	});

	it("should respect string restriction", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: [fixture],
		});

		resolver.resolve({}, fixture, "pck2", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			assert.ok(err instanceof Error);
			done();
		});
	});

	it("should try to find alternative #2", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFields: ["main", "style"],
			restrictions: [fixture, /\.(sass|scss|css)$/],
		});

		resolver.resolve({}, fixture, "pck2", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			assert.deepStrictEqual(
				result,
				path.resolve(fixture, "node_modules/pck2/index.css"),
			);
			done();
		});
	});

	it("should try to find alternative #3", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFields: ["main", "module", "style"],
			restrictions: [fixture, /\.(sass|scss|css)$/],
		});

		const log = [];

		resolver.resolve(
			{},
			fixture,
			"pck2",
			{ log: log.push.bind(log) },
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				assert.deepStrictEqual(
					result,
					path.resolve(fixture, "node_modules/pck2/index.css"),
				);
				assert.deepStrictEqual(
					log.map((line) =>
						line
							.replace(path.resolve(__dirname, ".."), "...")
							.replace(path.resolve(__dirname, ".."), "...")
							.replace(/\\/g, "/"),
					),
					[
						"resolve 'pck2' in '.../test/fixtures/restrictions'",
						"  Parsed request is a module",
						"  using description file: .../package.json (relative path: ./test/fixtures/restrictions)",
						"    resolve as module",
						"      looking for modules in .../test/fixtures/restrictions/node_modules",
						"        single file module",
						"          using description file: .../package.json (relative path: ./test/fixtures/restrictions/node_modules/pck2)",
						"            no extension",
						"              .../test/fixtures/restrictions/node_modules/pck2 is not a file",
						"            .js",
						"              .../test/fixtures/restrictions/node_modules/pck2.js doesn't exist",
						"        existing directory .../test/fixtures/restrictions/node_modules/pck2",
						"          using description file: .../test/fixtures/restrictions/node_modules/pck2/package.json (relative path: .)",
						"            using description file: .../package.json (relative path: ./test/fixtures/restrictions/node_modules/pck2)",
						"              no extension",
						"                .../test/fixtures/restrictions/node_modules/pck2 is not a file",
						"              .js",
						"                .../test/fixtures/restrictions/node_modules/pck2.js doesn't exist",
						"              as directory",
						"                existing directory .../test/fixtures/restrictions/node_modules/pck2",
						"                  using description file: .../test/fixtures/restrictions/node_modules/pck2/package.json (relative path: .)",
						"                    use ../../../c.js from main in package.json",
						"                      using description file: .../package.json (relative path: ./test/fixtures/c.js)",
						"                        no extension",
						"                          existing file: .../test/fixtures/c.js",
						"                            .../test/fixtures/c.js is not inside of the restriction .../test/fixtures/restrictions",
						"                        .js",
						"                          .../test/fixtures/c.js.js doesn't exist",
						"                        as directory",
						"                          .../test/fixtures/c.js is not a directory",
						"                    use ./module.js from module in package.json",
						"                      using description file: .../test/fixtures/restrictions/node_modules/pck2/package.json (relative path: ./module.js)",
						"                        no extension",
						"                          existing file: .../test/fixtures/restrictions/node_modules/pck2/module.js",
						"                            .../test/fixtures/restrictions/node_modules/pck2/module.js doesn't match the restriction //.(sass|scss|css)$/",
						"                        .js",
						"                          .../test/fixtures/restrictions/node_modules/pck2/module.js.js doesn't exist",
						"                        as directory",
						"                          .../test/fixtures/restrictions/node_modules/pck2/module.js is not a directory",
						"                    use ./index.css from style in package.json",
						"                      using description file: .../test/fixtures/restrictions/node_modules/pck2/package.json (relative path: ./index.css)",
						"                        no extension",
						"                          existing file: .../test/fixtures/restrictions/node_modules/pck2/index.css",
						"                            reporting result .../test/fixtures/restrictions/node_modules/pck2/index.css",
					],
				);
				done();
			},
		);
	});

	it("should throw an error when the path is outside a string restriction", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			restrictions: ["/definitely/not/here"],
		});
		const log = [];
		resolver.resolve(
			{},
			fixture,
			"pck1",
			{ log: (m) => log.push(m) },
			(err) => {
				assert.ok(err instanceof Error);
				assert.strictEqual(
					log.some((l) => l.includes("is not inside of the restriction")),
					true,
				);
				done();
			},
		);
	});

	it("should throw an error when the path does not match a regex restriction", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			restrictions: [/\.ts$/],
		});
		const log = [];
		resolver.resolve(
			{},
			fixture,
			"pck1",
			{ log: (m) => log.push(m) },
			(err) => {
				assert.ok(err instanceof Error);
				assert.strictEqual(
					log.some((l) => l.includes("doesn't match the restriction")),
					true,
				);
				done();
			},
		);
	});

	describe("path boundaries", () => {
		// The resolver handles both path flavors on every host, so a fake
		// filesystem is used to run the posix and the Windows cases everywhere.
		const createFileSystem = (file) => {
			const enoent = (requested) => {
				const err = /** @type {NodeJS.ErrnoException} */ (
					new Error(`ENOENT: no such file or directory, '${requested}'`)
				);
				err.code = "ENOENT";
				throw err;
			};
			const fileSystem = {
				statSync: (requested) =>
					requested === file
						? {
								isFile: () => true,
								isDirectory: () => false,
								isSymbolicLink: () => false,
							}
						: enoent(requested),
				lstatSync: (requested) => fileSystem.statSync(requested),
				readFileSync: enoent,
				readdirSync: enoent,
				readlinkSync: enoent,
			};
			return fileSystem;
		};

		const testCases = [
			{
				title: "a file inside a posix restriction",
				restriction: "/a/b/c",
				context: "/a/b/c",
				request: "./index.js",
				file: "/a/b/c/index.js",
				allowed: true,
			},
			{
				title: "a sibling of a posix restriction",
				restriction: "/a/b/c",
				context: "/a/b",
				request: "./c-other.js",
				file: "/a/b/c-other.js",
				allowed: false,
			},
			{
				// `\` is a regular filename character on posix, so this file is a
				// sibling of the restriction and not inside of it
				title: "a sibling of a posix restriction separated by a backslash",
				restriction: "/a/b/c",
				context: "/a/b",
				request: "./c\\sibling.js",
				file: "/a/b/c\\sibling.js",
				allowed: false,
			},
			{
				title: "a file inside a posix restriction ending with a separator",
				restriction: "/a/b/c/",
				context: "/a/b/c",
				request: "./index.js",
				file: "/a/b/c/index.js",
				allowed: true,
			},
			{
				title: "a file inside the posix root restriction",
				restriction: "/",
				context: "/a",
				request: "./index.js",
				file: "/a/index.js",
				allowed: true,
			},
			{
				title: "a file inside a non-normalized posix restriction",
				restriction: "/a/x/../b/c",
				context: "/a/b/c",
				request: "./index.js",
				file: "/a/b/c/index.js",
				allowed: true,
			},
			{
				title: "a file inside a windows restriction",
				restriction: "C:\\a\\b\\c",
				context: "C:\\a\\b\\c",
				request: "./index.js",
				file: "C:\\a\\b\\c\\index.js",
				allowed: true,
			},
			{
				title: "a sibling of a windows restriction",
				restriction: "C:\\a\\b\\c",
				context: "C:\\a\\b",
				request: "./c-other.js",
				file: "C:\\a\\b\\c-other.js",
				allowed: false,
			},
			{
				title: "a file inside a windows restriction ending with a separator",
				restriction: "C:\\a\\b\\c\\",
				context: "C:\\a\\b\\c",
				request: "./index.js",
				file: "C:\\a\\b\\c\\index.js",
				allowed: true,
			},
			{
				title: "a file inside a windows restriction written with slashes",
				restriction: "C:/a/b/c",
				context: "C:\\a\\b\\c",
				request: "./index.js",
				file: "C:\\a\\b\\c\\index.js",
				allowed: true,
			},
			{
				title: "a file inside a windows restriction from a mixed context",
				restriction: "C:\\a\\b\\c",
				context: "C:/a\\b",
				request: "./c/index.js",
				file: "C:\\a\\b\\c\\index.js",
				allowed: true,
			},
			{
				title: "a file inside a windows restriction differing in case",
				restriction: "C:\\A\\B\\C",
				context: "c:\\a\\b\\c",
				request: "./index.js",
				file: "c:\\a\\b\\c\\index.js",
				allowed: true,
			},
			{
				title: "a file inside a posix restriction differing in case",
				restriction: "/A/B/C",
				context: "/a/b/c",
				request: "./index.js",
				file: "/a/b/c/index.js",
				allowed: false,
			},
		];

		for (const {
			title,
			restriction,
			context,
			request,
			file,
			allowed,
		} of testCases) {
			it(`should ${allowed ? "resolve" : "not resolve"} ${title}`, (t, done) => {
				const resolver = ResolverFactory.createResolver({
					extensions: [".js"],
					useSyncFileSystemCalls: true,
					// @ts-expect-error a minimal filesystem is enough for these cases
					fileSystem: createFileSystem(file),
					restrictions: [restriction],
				});

				resolver.resolve({}, context, request, {}, (err, result) => {
					if (allowed) {
						if (err) return done(err);
						assert.deepStrictEqual(result, file);
					} else {
						if (!err) return done(new Error(`expect error, got ${result}`));
						assert.ok(err instanceof Error);
					}
					done();
				});
			});
		}
	});

	describe("windows and posix semantics", () => {
		// Windows accepts `/` and `\` interchangeably and mixed within one path,
		// and compares case-insensitively; posix does neither. The plugin is
		// driven directly because the resolver normalizes a path before it
		// reaches the plugin, so those forms cannot arrive through it.
		const testCases = [
			{
				title: "a windows path using slashes under a backslash restriction",
				restriction: "C:\\a\\b\\c",
				path: "C:/a/b/c/index.js",
				inside: true,
			},
			{
				title: "a windows path mixing separators under a slash restriction",
				restriction: "C:/a/b/c",
				path: "C:\\a\\b/c/index.js",
				inside: true,
			},
			{
				title: "a windows path under a restriction ending with a slash",
				restriction: "C:\\a\\b\\c/",
				path: "C:\\a\\b\\c\\index.js",
				inside: true,
			},
			{
				title: "a windows path differing in case from its restriction",
				restriction: "C:\\a\\b\\c",
				path: "c:\\A\\B\\C\\index.js",
				inside: true,
			},
			{
				title: "the restricted directory itself",
				restriction: "/a/b/c/",
				path: "/a/b/c",
				inside: true,
			},
			{
				title: "a path inside a UNC restriction",
				restriction: "\\\\server\\share\\a",
				path: "\\\\SERVER\\share\\a\\index.js",
				inside: true,
			},
			{
				title: "a path inside a DOS device restriction",
				restriction: "\\\\?\\C:\\a",
				path: "\\\\?\\C:\\a\\index.js",
				inside: true,
			},
			{
				title: "a path on another share than the UNC restriction",
				restriction: "\\\\server\\share\\a",
				path: "\\\\server\\other\\a\\index.js",
				inside: false,
			},
			{
				title: "a sibling of a windows restriction written with slashes",
				restriction: "C:\\a\\b\\c",
				path: "C:/a/b/c-other.js",
				inside: false,
			},
			{
				// separators are never interchangeable outside of windows paths
				title: "a posix sibling separated by a backslash",
				restriction: "/a/b/c",
				path: "/a/b/c\\sibling.js",
				inside: false,
			},
			{
				// the restriction contains a backslash but is still a posix path,
				// so the backslash names a directory instead of separating one
				title: "a posix sibling of a restriction containing a backslash",
				restriction: "/a/b\\c",
				path: "/a/b\\c\\sibling.js",
				inside: false,
			},
			{
				title: "a posix path differing in case from its restriction",
				restriction: "/a/b/c",
				path: "/A/B/C/index.js",
				inside: false,
			},
		];

		for (const { title, restriction, path: requestPath, inside } of testCases) {
			it(`should ${inside ? "allow" : "reject"} ${title}`, (t, done) => {
				const hook = new AsyncSeriesBailHook(["request", "resolveContext"]);

				new RestrictionsPlugin(hook, new Set([restriction])).apply(
					// @ts-expect-error a minimal resolver is enough for this plugin
					{ getHook: () => hook },
				);

				hook.callAsync({ path: requestPath }, {}, (err, result) => {
					if (err) return done(err);
					// the plugin bails with `null` when it filters a request out
					assert.strictEqual(result !== null, inside);
					done();
				});
			});
		}
	});

	describe("compared with node's path api", () => {
		// Containment is Node's answer, not ours: a target is inside a parent
		// when `relative(parent, target)` neither escapes upward nor is absolute.
		// Which flavor answers is where `win32` and `posix` disagree about the
		// root of the restriction.
		const isWindowsPath = (maybePath) =>
			path.win32.parse(maybePath).root !== path.posix.parse(maybePath).root;

		const nodeSaysInside = (parent, target) => {
			const flavor = isWindowsPath(parent) ? path.win32 : path.posix;
			const relative = flavor.relative(parent, target);
			return (
				relative === "" ||
				(!relative.startsWith("..") && !flavor.isAbsolute(relative))
			);
		};

		const restrictions = [
			"/a/b/c",
			"/a/b/c/",
			"/a/b\\c",
			"/",
			"C:\\a\\b\\c",
			"C:\\a\\b\\c\\",
			"C:/a/b/c",
			"C:\\",
			"\\\\server\\share\\a",
			"\\\\?\\C:\\a",
		];

		const swapSeparators = (maybePath) =>
			maybePath.replace(/[\\/]/g, (char) => (char === "/" ? "\\" : "/"));

		const targetsFor = (restriction) => {
			const separator = isWindowsPath(restriction) ? "\\" : "/";
			const other = separator === "\\" ? "/" : "\\";
			const trimmed = restriction.replace(/[\\/]+$/, "") || separator;
			const targets = new Set();
			for (const base of [
				trimmed,
				swapSeparators(trimmed),
				trimmed.toUpperCase(),
				trimmed.toLowerCase(),
			]) {
				for (const suffix of [
					"",
					`${separator}index.js`,
					`${other}index.js`,
					`${separator}sub${other}index.js`,
					"-other.js",
					"\\sibling.js",
				]) {
					targets.add(base + suffix);
				}
			}
			for (const unrelated of [
				"/unrelated/index.js",
				"D:\\unrelated\\index.js",
				"\\\\server\\other\\index.js",
			]) {
				targets.add(unrelated);
			}
			return [...targets];
		};

		let insideCount = 0;
		let outsideCount = 0;

		for (const restriction of restrictions) {
			for (const target of targetsFor(restriction)) {
				const flavor = isWindowsPath(restriction) ? path.win32 : path.posix;
				// `relative` resolves a non-absolute input against `process.cwd()`,
				// which says nothing about containment
				if (!flavor.isAbsolute(restriction) || !flavor.isAbsolute(target)) {
					continue;
				}
				// a `.`/`..` segment or a doubled separator never reaches the plugin,
				// the resolver normalizes those away first - a mixed separator does
				// survive on windows, so only the separators are canonicalized here
				const canonical = isWindowsPath(restriction)
					? target.replace(/\//g, "\\")
					: target;
				if (flavor.normalize(canonical) !== canonical) continue;

				const inside = nodeSaysInside(restriction, target);
				if (inside) {
					insideCount++;
				} else {
					outsideCount++;
				}

				it(`should ${inside ? "allow" : "reject"} ${JSON.stringify(target)} under ${JSON.stringify(restriction)}`, (t, done) => {
					const hook = new AsyncSeriesBailHook(["request", "resolveContext"]);

					new RestrictionsPlugin(hook, new Set([restriction])).apply(
						// @ts-expect-error a minimal resolver is enough for this plugin
						{ getHook: () => hook },
					);

					hook.callAsync({ path: target }, {}, (err, result) => {
						if (err) return done(err);
						assert.strictEqual(result !== null, inside);
						done();
					});
				});
			}
		}

		it("should have compared both verdicts", () => {
			// guards against a generator change quietly emptying the matrix above
			assert.ok(insideCount > 50, `only ${insideCount} inside cases`);
			assert.ok(outsideCount > 50, `only ${outsideCount} outside cases`);
		});
	});

	describe("with symlinks", () => {
		const symlinkRoot = path.resolve(__dirname, "temp-restrictions-symlink");
		const allowed = path.join(symlinkRoot, "allowed");
		const outside = path.join(symlinkRoot, "outside");

		let canSymlink = true;
		try {
			fs.mkdirSync(allowed, { recursive: true });
			fs.mkdirSync(outside, { recursive: true });
			fs.writeFileSync(path.join(outside, "secret.js"), "module.exports = 1;");
			fs.writeFileSync(path.join(allowed, "real.js"), "module.exports = 2;");
			fs.symlinkSync(
				path.join(outside, "secret.js"),
				path.join(allowed, "link.js"),
				"file",
			);
			fs.symlinkSync(
				path.join("..", "outside", "secret.js"),
				path.join(allowed, "rel-link.js"),
				"file",
			);
		} catch (_err) {
			canSymlink = false;
		}

		after(() => {
			for (const file of [
				path.join(allowed, "link.js"),
				path.join(allowed, "rel-link.js"),
				path.join(allowed, "real.js"),
				path.join(outside, "secret.js"),
			]) {
				try {
					fs.unlinkSync(file);
				} catch (_err) {
					// ignore
				}
			}
			for (const dir of [allowed, outside, symlinkRoot]) {
				try {
					fs.rmdirSync(dir);
				} catch (_err) {
					// ignore
				}
			}
		});

		if (canSymlink) {
			it("should reject an in-root symlink whose real target is outside the restriction", (t, done) => {
				const resolver = ResolverFactory.createResolver({
					fileSystem: nodeFileSystem,
					extensions: [".js"],
					restrictions: [allowed],
				});

				resolver.resolve({}, allowed, "./link.js", {}, (err, result) => {
					if (!err) return done(new Error(`expect error, got ${result}`));
					assert.ok(err instanceof Error);
					done();
				});
			});

			it("should reject an in-root relative symlink whose real target is outside the restriction", (t, done) => {
				const resolver = ResolverFactory.createResolver({
					fileSystem: nodeFileSystem,
					extensions: [".js"],
					restrictions: [allowed],
				});

				resolver.resolve({}, allowed, "./rel-link.js", {}, (err, result) => {
					if (!err) return done(new Error(`expect error, got ${result}`));
					assert.ok(err instanceof Error);
					done();
				});
			});

			it("should still resolve a real in-root file under the restriction", (t, done) => {
				const resolver = ResolverFactory.createResolver({
					fileSystem: nodeFileSystem,
					extensions: [".js"],
					restrictions: [allowed],
				});

				resolver.resolve({}, allowed, "./real.js", {}, (err, result) => {
					if (err) return done(err);
					assert.deepStrictEqual(result, path.join(allowed, "real.js"));
					done();
				});
			});
		} else {
			it("cannot test symlinks because we have no permission to create them", () => {
				// Nothing
			});
		}
	});
});
