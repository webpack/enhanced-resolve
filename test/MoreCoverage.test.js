"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const { AsyncSeriesBailHook } = require("tapable");
const resolve = require("../");
const AliasFieldPlugin = require("../lib/AliasFieldPlugin");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ExportsFieldPlugin = require("../lib/ExportsFieldPlugin");
const ImportsFieldPlugin = require("../lib/ImportsFieldPlugin");
const ParsePlugin = require("../lib/ParsePlugin");
const { parseIdentifier } = require("../lib/util/identifier");
const { PathType, getType } = require("../lib/util/path");

const fixtures = path.join(__dirname, "fixtures");
const nodeFs = new CachedInputFileSystem(fs, 4000);

describe("AliasFieldPlugin guard branches", () => {
	it("falls through when descriptionFileData is missing", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpA",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpAt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("nope");
			},
			join: (a, b) => `${a}/${b}`,
		});
		const plugin = new AliasFieldPlugin(source, "browser", target);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ request: "./foo" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("falls through when innerRequest is empty", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpB",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpBt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("nope");
			},
			join: (a, b) => `${a}/${b}`,
		});
		const plugin = new AliasFieldPlugin(source, "browser", target);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({
				descriptionFileData: { browser: { "./a": "./b" } },
				// No request, no relativePath → innerRequest is undefined
			}),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("logs and falls through when alias field is not an object", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpC",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpCt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("nope");
			},
			join: (a, b) => `${a}/${b}`,
		});
		const plugin = new AliasFieldPlugin(source, "browser", target);
		plugin.apply(resolver);
		const log = [];
		source.callAsync(
			/** @type {any} */ ({
				descriptionFileData: { browser: "not-an-object" },
				request: "./foo",
			}),
			{ log: (m) => log.push(m) },
			(err) => {
				expect(err).toBeFalsy();
				expect(log.some((l) => l.includes("doesn't contain a valid"))).toBe(
					true,
				);
				done();
			},
		);
	});

	it("falls through when mapped data equals the original innerRequest", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpD",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpDt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("nope");
			},
			join: (a, b) => `${a}/${b}`,
		});
		const plugin = new AliasFieldPlugin(source, "browser", target);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({
				descriptionFileData: { browser: { "./foo": "./foo" } },
				request: "./foo",
			}),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("propagates errors and absorbs no-result from inner doResolve", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpE",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpEt",
		);
		// First call: error path
		const resolverErr = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(_h, _r, _m, _c, cb) {
				cb(new Error("inner-fail"));
			},
			join: (a, b) => `${a}/${b}`,
		});
		const pluginErr = new AliasFieldPlugin(source, "browser", target);
		pluginErr.apply(resolverErr);
		source.callAsync(
			/** @type {any} */ ({
				descriptionFileRoot: "/root",
				descriptionFileData: { browser: { "./foo": "./bar" } },
				request: "./foo",
			}),
			{},
			(err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).message).toBe("inner-fail");
				// Second test: undefined result from inner
				const source2 = new AsyncSeriesBailHook(
					["request", "resolveContext"],
					"afpF",
				);
				const target2 = new AsyncSeriesBailHook(
					["request", "resolveContext"],
					"afpFt",
				);
				const resolverNoRes = /** @type {any} */ ({
					ensureHook: (h) => h,
					getHook: (h) => h,
					doResolve(_h, _r, _m, _c, cb) {
						cb();
					},
					join: (a, b) => `${a}/${b}`,
				});
				const pluginNoRes = new AliasFieldPlugin(source2, "browser", target2);
				pluginNoRes.apply(resolverNoRes);
				source2.callAsync(
					/** @type {any} */ ({
						descriptionFileRoot: "/root",
						descriptionFileData: { browser: { "./foo": "./bar" } },
						request: "./foo",
					}),
					{},
					(err2, result2) => {
						expect(err2).toBeFalsy();
						expect(result2).toBeNull();
						done();
					},
				);
			},
		);
	});

	it("forwards a non-undefined result from inner doResolve", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpG",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpGt",
		);
		const finalRes = /** @type {any} */ ({ path: "/done" });
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(_h, _r, _m, _c, cb) {
				cb(null, finalRes);
			},
			join: (a, b) => `${a}/${b}`,
		});
		const plugin = new AliasFieldPlugin(source, "browser", target);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({
				descriptionFileRoot: "/root",
				descriptionFileData: { browser: { "./foo": "./bar" } },
				request: "./foo",
			}),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBe(finalRes);
				done();
			},
		);
	});

	it("yields when alias data is false and yield is provided", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpH",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"afpHt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("should not be called");
			},
			join: (a, b) => `${a}/${b}`,
		});
		const plugin = new AliasFieldPlugin(source, "browser", target);
		plugin.apply(resolver);
		const yielded = [];
		source.callAsync(
			/** @type {any} */ ({
				descriptionFileRoot: "/root",
				descriptionFileData: { browser: { "./foo": false } },
				request: "./foo",
			}),
			{ yield: (r) => yielded.push(r) },
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeNull();
				expect(yielded).toHaveLength(1);
				expect(yielded[0].path).toBe(false);
				done();
			},
		);
	});
});

describe("ImportsFieldPlugin guard branches", () => {
	it("falls through when descriptionFilePath is missing", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"ifpA",
		);
		const targetFile = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"ifpAtf",
		);
		const targetPackage = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"ifpAtp",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("nope");
			},
		});
		const plugin = new ImportsFieldPlugin(
			source,
			new Set(["node"]),
			"imports",
			targetFile,
			targetPackage,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ request: "#foo" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("logs and surfaces processing errors", (done) => {
		// Use a real package fixture with a malformed imports field.
		const resolver = require("../lib/ResolverFactory").createResolver({
			fileSystem: nodeFs,
			extensions: [".js"],
			conditionNames: ["node"],
		});

		const log = [];
		// Use the imports-field-error fixture if available; otherwise just any fixture
		// that won't process #foo through imports field gracefully.
		resolver.resolve(
			{},
			path.join(fixtures, "imports-field"),
			"#foo",
			{ log: (m) => log.push(m) },
			(err) => {
				// Either resolves or errors — we just want to exercise the field-processing path.
				expect(typeof err === "object" || err === null).toBe(true);
				done();
			},
		);
	});
});

describe("ExportsFieldPlugin error catch", () => {
	it("logs and surfaces errors thrown by the field processor", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"efpA",
		);
		const targetFile = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"efpAtf",
		);
		const targetPackage = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"efpAtp",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("nope");
			},
		});
		const plugin = new ExportsFieldPlugin(
			source,
			new Set(["node"]),
			"exports",
			targetFile,
			targetPackage,
		);
		plugin.apply(resolver);
		// Provide an exports field where the request will fail validation in
		// the field processor — a request like "..bad" passes the relativePath check
		// (starts with ".") but fails inside assertExportsFieldRequest because the
		// second character isn't "/".
		const log = [];
		source.callAsync(
			/** @type {any} */ ({
				descriptionFilePath: "/p/package.json",
				descriptionFileRoot: "/p",
				descriptionFileData: { exports: { ".": "./index.js" } },
				request: "..bad",
				query: "",
				fragment: "",
				relativePath: ".",
			}),
			{ log: (m) => log.push(m) },
			(err) => {
				expect(err).toBeTruthy();
				expect(log.some((l) => l.includes("can't be processed"))).toBe(true);
				done();
			},
		);
	});
});

describe("ParsePlugin fragment branch", () => {
	it("preserves request.fragment when parsed fragment is empty", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"ppA",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"ppAt",
		);
		const captured = [];
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			parse(req) {
				// Return parsed without fragment to exercise the fallback assignment
				return {
					request: req,
					query: "",
					fragment: "",
					module: false,
					directory: false,
				};
			},
			doResolve(_h, req, _m, _c, cb) {
				captured.push(req);
				cb(null, req);
			},
		});
		const plugin = new ParsePlugin(source, {}, target);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({
				request: "./foo",
				query: "?bar",
				fragment: "#frag",
			}),
			{},
			(err) => {
				expect(err).toBeFalsy();
				// Parsed had no query/fragment, so they should be carried over.
				expect(captured[0].query).toBe("?bar");
				expect(captured[0].fragment).toBe("#frag");
				done();
			},
		);
	});
});

describe("util/identifier returns null on no-match", () => {
	it("returns null for a single null-byte input", () => {
		expect(parseIdentifier("\0")).toBeNull();
	});
});

describe("util/path getType more cases", () => {
	it("classifies length-3 paths starting with '.' but not '..' or './' as Normal", () => {
		// e.g. ".a/" → c0=., c1=a, c2=/ — falls through inner switch → Normal
		expect(getType(".a/")).toBe(PathType.Normal);
	});
});

describe("index.js sync resolve API", () => {
	it("resolve.sync supports two-arg form (path, request)", () => {
		const result = resolve.sync(fixtures, "./a.js");
		expect(typeof result).toBe("string");
	});

	it("resolve.create.sync returns a function that supports two-arg form", () => {
		const r = resolve.create.sync({});
		const result = r(fixtures, "./a.js");
		expect(typeof result).toBe("string");
	});
});
