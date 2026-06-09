"use strict";

const fs = require("fs");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");
const enhancedResolve = require("../lib");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ResolverFactory = require("../lib/ResolverFactory");
const { toPath } = require("../lib/util/path");

describe("file: URL path options", () => {
	const fixtures = path.resolve(__dirname, "fixtures");
	const modulesDir = path.resolve(fixtures, "node_modules");
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	const makeResolver = (options) =>
		ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem,
			...options,
		});

	describe("roots", () => {
		it("should accept a URL instance", (done) => {
			const resolver = makeResolver({ roots: [pathToFileURL(fixtures)] });
			resolver.resolve({}, fixtures, "/b.js", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixtures, "b.js"));
				done();
			});
		});
	});

	describe("modules", () => {
		it("should accept a URL instance", (done) => {
			const resolver = makeResolver({ modules: [pathToFileURL(modulesDir)] });
			resolver.resolve({}, fixtures, "m1/a", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(modulesDir, "m1/a.js"));
				done();
			});
		});

		it("should accept a single URL instance", (done) => {
			const resolver = makeResolver({ modules: pathToFileURL(modulesDir) });
			resolver.resolve({}, fixtures, "m1/a", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(modulesDir, "m1/a.js"));
				done();
			});
		});

		it("should keep folder-name entries untouched", (done) => {
			const resolver = makeResolver({ modules: ["node_modules"] });
			resolver.resolve({}, fixtures, "m1/a", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(modulesDir, "m1/a.js"));
				done();
			});
		});
	});

	describe("alias", () => {
		it("should accept a URL instance as the target", (done) => {
			const resolver = makeResolver({
				alias: { "@": pathToFileURL(fixtures) },
			});
			resolver.resolve({}, fixtures, "@/b.js", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixtures, "b.js"));
				done();
			});
		});

		it("should accept a URL instance in an array target", (done) => {
			const resolver = makeResolver({
				alias: { "@": [pathToFileURL(modulesDir), pathToFileURL(fixtures)] },
			});
			resolver.resolve({}, fixtures, "@/b.js", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixtures, "b.js"));
				done();
			});
		});

		it("should accept array-form entries with a URL target", (done) => {
			const resolver = makeResolver({
				alias: [{ name: "@", alias: pathToFileURL(fixtures) }],
			});
			resolver.resolve({}, fixtures, "@/b.js", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixtures, "b.js"));
				done();
			});
		});

		// A `file:` string target is not converted here (strings stay literal),
		// but the rewritten request still resolves because the request side
		// (`parseIdentifier`) converts `file:` request strings.
		it("should still resolve a file: string target via request parsing", (done) => {
			const resolver = makeResolver({
				alias: { "@": String(pathToFileURL(fixtures)) },
			});
			resolver.resolve({}, fixtures, "@/b.js", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixtures, "b.js"));
				done();
			});
		});
	});

	describe("restrictions", () => {
		it("should accept a URL instance", (done) => {
			const resolver = makeResolver({
				restrictions: [pathToFileURL(fixtures)],
			});
			resolver.resolve({}, fixtures, "./b.js", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixtures, "b.js"));
				done();
			});
		});

		it("should keep RegExp entries untouched", (done) => {
			const resolver = makeResolver({ restrictions: [/\.js$/] });
			resolver.resolve({}, fixtures, "./b.js", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(path.resolve(fixtures, "b.js"));
				done();
			});
		});

		// A `file:` string restriction stays literal, so no real path is ever
		// "inside" it and resolution is blocked — use a URL instance or a path.
		it("should treat a file: string restriction as a literal path", (done) => {
			const resolver = makeResolver({
				restrictions: [String(pathToFileURL(fixtures))],
			});
			resolver.resolve({}, fixtures, "./b.js", {}, (err) => {
				expect(err).toBeInstanceOf(Error);
				done();
			});
		});
	});

	describe("tsconfig", () => {
		const tsconfigDir = path.resolve(fixtures, "tsconfig-paths", "base");
		const tsconfigFile = path.join(tsconfigDir, "tsconfig.json");

		it("should accept a URL instance as the config file", (done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: pathToFileURL(tsconfigFile),
			});
			resolver.resolve(
				{},
				tsconfigDir,
				"@components/button",
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toEqual(
						path.join(tsconfigDir, "src", "components", "button.ts"),
					);
					done();
				},
			);
		});

		it("should accept a URL instance as options.configFile", (done) => {
			const resolver = ResolverFactory.createResolver({
				fileSystem,
				extensions: [".ts", ".tsx"],
				mainFields: ["browser", "main"],
				mainFiles: ["index"],
				tsconfig: { configFile: pathToFileURL(tsconfigFile) },
			});
			resolver.resolve(
				{},
				tsconfigDir,
				"@components/button",
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toEqual(
						path.join(tsconfigDir, "src", "components", "button.ts"),
					);
					done();
				},
			);
		});
	});

	describe("toPath", () => {
		it("should convert a file: URL instance to a path", () => {
			expect(toPath(pathToFileURL(modulesDir))).toBe(modulesDir);
		});

		// A string is always a literal path (matches Node fs, nodejs/node#17658),
		// so a directory literally named `file:` is never mistaken for a URL.
		it("should leave strings untouched, including `file:`-prefixed ones", () => {
			expect(toPath("file:foo")).toBe("file:foo");
			expect(toPath("file:///abs")).toBe("file:///abs");
			expect(toPath(modulesDir)).toBe(modulesDir);
		});
	});
});

describe("file: URL resolve context and request", () => {
	const fixtures = path.resolve(__dirname, "fixtures");
	const bFile = path.resolve(fixtures, "b.js");
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem,
	});

	describe("context (path) argument", () => {
		it("should accept a URL instance as the context path", (done) => {
			resolver.resolve(
				{},
				pathToFileURL(fixtures),
				"./b.js",
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toEqual(bFile);
					done();
				},
			);
		});

		it("should accept a URL context when the context object is omitted", (done) => {
			resolver.resolve(pathToFileURL(fixtures), "./b.js", {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(bFile);
				done();
			});
		});

		it("should still reject a non-string, non-URL context path", (done) => {
			// @ts-expect-error for tests
			resolver.resolve({}, 42, "./b.js", {}, (err) => {
				expect(err).toBeInstanceOf(Error);
				expect(/** @type {Error} */ (err).message).toMatch(
					/path argument is not a string/,
				);
				done();
			});
		});
	});

	describe("request argument", () => {
		it("should accept a file: URL instance as the request", (done) => {
			resolver.resolve(
				{},
				fixtures,
				pathToFileURL(bFile),
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toEqual(bFile);
					done();
				},
			);
		});

		it("should still reject a non-string, non-URL request", (done) => {
			// @ts-expect-error for tests
			resolver.resolve({}, fixtures, 42, {}, (err) => {
				expect(err).toBeInstanceOf(Error);
				expect(/** @type {Error} */ (err).message).toMatch(
					/request argument is not a string/,
				);
				done();
			});
		});
	});

	// With both arguments as URL instances the pair mirrors `new URL(request,
	// context)` — request is the first param, context the base — so an absolute
	// `file:` request wins over the context base, exactly like the URL constructor.
	describe("both context and request as URL", () => {
		it("should resolve a URL request against a URL context like new URL()", (done) => {
			const contextURL = pathToFileURL(fixtures);
			const requestURL = pathToFileURL(bFile);
			resolver.resolve({}, contextURL, requestURL, {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(bFile);
				expect(result).toEqual(fileURLToPath(new URL(requestURL, contextURL)));
				done();
			});
		});
	});

	describe("high-level resolve API", () => {
		it("resolve should accept a URL context with the context object omitted", (done) => {
			enhancedResolve(pathToFileURL(fixtures), "./b.js", (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(bFile);
				done();
			});
		});

		it("resolveSync should accept a URL context", () => {
			expect(enhancedResolve.sync(pathToFileURL(fixtures), "./b.js")).toEqual(
				bFile,
			);
		});

		it("resolvePromise should accept a URL context", async () => {
			await expect(
				enhancedResolve.promise(pathToFileURL(fixtures), "./b.js"),
			).resolves.toEqual(bFile);
		});
	});
});
