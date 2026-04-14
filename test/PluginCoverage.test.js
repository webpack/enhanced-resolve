"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const { AsyncSeriesBailHook } = require("tapable");
const AliasPlugin = require("../lib/AliasPlugin");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const DescriptionFilePlugin = require("../lib/DescriptionFilePlugin");
const DirectoryExistsPlugin = require("../lib/DirectoryExistsPlugin");
const FileExistsPlugin = require("../lib/FileExistsPlugin");
const JoinRequestPartPlugin = require("../lib/JoinRequestPartPlugin");
const ResolverFactory = require("../lib/ResolverFactory");
const RestrictionsPlugin = require("../lib/RestrictionsPlugin");
const ResultPlugin = require("../lib/ResultPlugin");
const RootsPlugin = require("../lib/RootsPlugin");
const SelfReferencePlugin = require("../lib/SelfReferencePlugin");

const fixtures = path.join(__dirname, "fixtures");
const nodeFs = new CachedInputFileSystem(fs, 4000);

/**
 * @param {string} sourceName source hook name
 * @param {string} targetName target hook name
 * @returns {{ source: AsyncSeriesBailHook, target: AsyncSeriesBailHook, doResolveCalls: any[], resolver: any }} harness
 */
function harness(sourceName, targetName) {
	const source = new AsyncSeriesBailHook(
		["request", "resolveContext"],
		sourceName,
	);
	const target = new AsyncSeriesBailHook(
		["request", "resolveContext"],
		targetName,
	);
	const doResolveCalls = [];
	const resolver = {
		fileSystem: nodeFs,
		ensureHook: (h) => h,
		getHook: (h) => h,
		join: (a, b) => `${a}/${b}`,
		doResolve(hook, request, message, ctx, cb) {
			doResolveCalls.push({ hook, request, message });
			cb(null, request);
		},
	};
	return { source, target, doResolveCalls, resolver };
}

describe("AliasPlugin constructor", () => {
	it("accepts a single non-array option", () => {
		const opt = { name: "foo", alias: "/bar" };
		const plugin = new AliasPlugin("source", opt, "target");
		expect(plugin.options).toEqual([opt]);
	});

	it("accepts an array of options", () => {
		const opts = [
			{ name: "a", alias: "/a" },
			{ name: "b", alias: "/b" },
		];
		const plugin = new AliasPlugin("source", opts, "target");
		expect(plugin.options).toBe(opts);
	});
});

describe("RootsPlugin guard clauses", () => {
	it("falls through when request.request is empty", (done) => {
		const h = harness("rootsSrc", "rootsTgt");
		const plugin = new RootsPlugin(h.source, new Set(["/root"]), h.target);
		plugin.apply(h.resolver);

		h.source.callAsync(
			/** @type {any} */ ({ request: "" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				expect(h.doResolveCalls).toEqual([]);
				done();
			},
		);
	});

	it("falls through when request does not start with /", (done) => {
		const h = harness("rootsSrc2", "rootsTgt2");
		const plugin = new RootsPlugin(h.source, new Set(["/root"]), h.target);
		plugin.apply(h.resolver);

		h.source.callAsync(
			/** @type {any} */ ({ request: "./relative" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				expect(h.doResolveCalls).toEqual([]);
				done();
			},
		);
	});

	it("delegates absolute requests to each root", (done) => {
		const h = harness("rootsSrc3", "rootsTgt3");
		const plugin = new RootsPlugin(h.source, new Set(["/r1", "/r2"]), h.target);
		plugin.apply(h.resolver);

		h.source.callAsync(
			/** @type {any} */ ({ request: "/sub", relativePath: "/orig" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeTruthy();
				expect(h.doResolveCalls.length).toBeGreaterThanOrEqual(1);
				done();
			},
		);
	});
});

describe("SelfReferencePlugin guard clauses", () => {
	it("falls through when descriptionFilePath is missing", (done) => {
		const h = harness("srSrc", "srTgt");
		const plugin = new SelfReferencePlugin(h.source, "exports", h.target);
		plugin.apply(h.resolver);
		h.source.callAsync(
			/** @type {any} */ ({ request: "self/sub" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("falls through when request is empty", (done) => {
		const h = harness("srSrc2", "srTgt2");
		const plugin = new SelfReferencePlugin(h.source, "exports", h.target);
		plugin.apply(h.resolver);
		h.source.callAsync(
			/** @type {any} */ ({
				descriptionFilePath: "/p/package.json",
				descriptionFileData: { name: "self", exports: { ".": "./index.js" } },
				request: "",
			}),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("falls through when no exports field is present", (done) => {
		const h = harness("srSrc3", "srTgt3");
		const plugin = new SelfReferencePlugin(h.source, "exports", h.target);
		plugin.apply(h.resolver);
		h.source.callAsync(
			/** @type {any} */ ({
				descriptionFilePath: "/p/package.json",
				descriptionFileData: { name: "self" },
				request: "self/sub",
			}),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("falls through when name field is not a string", (done) => {
		const h = harness("srSrc4", "srTgt4");
		const plugin = new SelfReferencePlugin(h.source, "exports", h.target);
		plugin.apply(h.resolver);
		h.source.callAsync(
			/** @type {any} */ ({
				descriptionFilePath: "/p/package.json",
				descriptionFileData: {
					name: { not: "a string" },
					exports: { ".": "./index.js" },
				},
				request: "self/sub",
			}),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("falls through when request does not match the package name", (done) => {
		const h = harness("srSrc5", "srTgt5");
		const plugin = new SelfReferencePlugin(h.source, "exports", h.target);
		plugin.apply(h.resolver);
		h.source.callAsync(
			/** @type {any} */ ({
				descriptionFilePath: "/p/package.json",
				descriptionFileData: {
					name: "myname",
					exports: { ".": "./index.js" },
				},
				request: "different",
			}),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});
});

describe("DirectoryExistsPlugin", () => {
	it("falls through when request.path is empty", (done) => {
		const h = harness("deSrc", "deTgt");
		const plugin = new DirectoryExistsPlugin(h.source, h.target);
		plugin.apply(h.resolver);
		h.source.callAsync(/** @type {any} */ ({ path: "" }), {}, (err, result) => {
			expect(err).toBeFalsy();
			expect(result).toBeUndefined();
			done();
		});
	});

	it("logs and falls through when path is not a directory", (done) => {
		const h = harness("deSrc2", "deTgt2");
		const plugin = new DirectoryExistsPlugin(h.source, h.target);
		plugin.apply(h.resolver);
		const missing = new Set();
		const log = [];
		// Use a real file (not a directory) under fixtures.
		h.source.callAsync(
			/** @type {any} */ ({ path: path.join(fixtures, "a.js") }),
			{
				missingDependencies: missing,
				log: (m) => log.push(m),
			},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				expect(missing.has(path.join(fixtures, "a.js"))).toBe(true);
				expect(log.some((l) => l.includes("is not a directory"))).toBe(true);
				done();
			},
		);
	});
});

describe("FileExistsPlugin", () => {
	it("falls through when request.path is empty", (done) => {
		const h = harness("feSrc", "feTgt");
		const plugin = new FileExistsPlugin(h.source, h.target);
		plugin.apply(h.resolver);
		h.source.callAsync(/** @type {any} */ ({ path: "" }), {}, (err, result) => {
			expect(err).toBeFalsy();
			expect(result).toBeUndefined();
			done();
		});
	});

	it("logs and falls through when path is a directory (not a file)", (done) => {
		const h = harness("feSrc2", "feTgt2");
		const plugin = new FileExistsPlugin(h.source, h.target);
		plugin.apply(h.resolver);
		const missing = new Set();
		const log = [];
		h.source.callAsync(
			/** @type {any} */ ({ path: fixtures }),
			{
				missingDependencies: missing,
				log: (m) => log.push(m),
			},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				expect(missing.has(fixtures)).toBe(true);
				expect(log.some((l) => l.includes("is not a file"))).toBe(true);
				done();
			},
		);
	});
});

describe("JoinRequestPartPlugin", () => {
	it("treats missing request.request as empty string", (done) => {
		const h = harness("jrpSrc", "jrpTgt");
		const plugin = new JoinRequestPartPlugin(h.source, h.target);
		plugin.apply(h.resolver);
		h.source.callAsync(
			/** @type {any} */ ({ path: "/p" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeTruthy();
				done();
			},
		);
	});
});

describe("DescriptionFilePlugin guard clauses", () => {
	it("falls through when path is empty", (done) => {
		const h = harness("dfpSrc", "dfpTgt");
		const plugin = new DescriptionFilePlugin(
			h.source,
			["package.json"],
			false,
			h.target,
		);
		plugin.apply(h.resolver);
		h.source.callAsync(/** @type {any} */ ({ path: "" }), {}, (err, result) => {
			expect(err).toBeFalsy();
			expect(result).toBeUndefined();
			done();
		});
	});

	it("falls through when cdUp returns null (root)", (done) => {
		const h = harness("dfpSrc2", "dfpTgt2");
		// pathIsFile=true means we cdUp; "/" cdUp returns null
		const plugin = new DescriptionFilePlugin(
			h.source,
			["package.json"],
			true,
			h.target,
		);
		plugin.apply(h.resolver);
		h.source.callAsync(
			/** @type {any} */ ({ path: "/" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});
});

describe("ResultPlugin error path", () => {
	it("propagates errors from the result hook", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"resultSource",
		);

		// Build a minimal resolver-like with hooks.result
		const { AsyncSeriesHook } = require("tapable");

		const resultHook = new AsyncSeriesHook(["result", "resolveContext"]);
		resultHook.tapAsync("ErroringPlugin", (_r, _c, cb) =>
			cb(new Error("fail")),
		);
		const resolver = { hooks: { result: resultHook } };
		const plugin = new ResultPlugin(source);
		plugin.apply(/** @type {any} */ (resolver));
		source.callAsync(/** @type {any} */ ({ path: "/p" }), {}, (err) => {
			expect(err).toBeTruthy();
			expect(/** @type {any} */ (err).message).toBe("fail");
			done();
		});
	});

	it("yields the result when resolveContext.yield is set", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"resultSource2",
		);

		const { AsyncSeriesHook } = require("tapable");

		const resultHook = new AsyncSeriesHook(["result", "resolveContext"]);
		const resolver = { hooks: { result: resultHook } };
		const plugin = new ResultPlugin(source);
		plugin.apply(/** @type {any} */ (resolver));

		const yielded = [];
		source.callAsync(
			/** @type {any} */ ({ path: "/p" }),
			{ yield: (r) => yielded.push(r), log: (m) => m },
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeNull();
				expect(yielded).toHaveLength(1);
				expect(yielded[0].path).toBe("/p");
				done();
			},
		);
	});
});

describe("RestrictionsPlugin", () => {
	it("logs and aborts when the path is outside a string restriction", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"restrictionSrc",
		);
		const resolver = /** @type {any} */ ({
			getHook: () => source,
		});
		const plugin = new RestrictionsPlugin(source, new Set(["/allowed"]));
		plugin.apply(resolver);
		const log = [];
		source.callAsync(
			/** @type {any} */ ({ path: "/elsewhere/file.js" }),
			{ log: (m) => log.push(m) },
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeNull();
				expect(
					log.some((l) => l.includes("is not inside of the restriction")),
				).toBe(true);
				done();
			},
		);
	});

	it("logs and aborts when the path doesn't match a regex restriction", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"restrictionSrc2",
		);
		const resolver = /** @type {any} */ ({ getHook: () => source });
		const plugin = new RestrictionsPlugin(source, new Set([/\.ts$/]));
		plugin.apply(resolver);
		const log = [];
		source.callAsync(
			/** @type {any} */ ({ path: "/file.js" }),
			{ log: (m) => log.push(m) },
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeNull();
				expect(
					log.some((l) => l.includes("doesn't match the restriction")),
				).toBe(true);
				done();
			},
		);
	});

	it("passes through when restrictions are all satisfied", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"restrictionSrc3",
		);
		const resolver = /** @type {any} */ ({ getHook: () => source });
		const plugin = new RestrictionsPlugin(
			source,
			new Set(["/allowed", /\.js$/]),
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ path: "/allowed/file.js" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("passes through when request.path is not a string", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"restrictionSrc4",
		);
		const resolver = /** @type {any} */ ({ getHook: () => source });
		const plugin = new RestrictionsPlugin(source, new Set(["/allowed"]));
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ path: false }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});
});

describe("ResolverFactory mainFields normalization", () => {
	it("accepts string entries", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			mainFields: ["main"],
		});
		expect(r.options.mainFields).toEqual([
			{ name: ["main"], forceRelative: true },
		]);
	});

	it("accepts array entries", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			mainFields: [["browser", "main"]],
		});
		expect(r.options.mainFields).toEqual([
			{ name: ["browser", "main"], forceRelative: true },
		]);
	});

	it("accepts object entries with name and forceRelative", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			mainFields: [{ name: "main", forceRelative: false }],
		});
		expect(r.options.mainFields).toEqual([
			{ name: ["main"], forceRelative: false },
		]);
	});

	it("accepts object entries with array name", () => {
		const r = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			mainFields: [{ name: ["a", "b"], forceRelative: true }],
		});
		expect(r.options.mainFields).toEqual([
			{ name: ["a", "b"], forceRelative: true },
		]);
	});

	it("accepts a function plugin", () => {
		let called = false;
		ResolverFactory.createResolver({
			fileSystem: nodeFs,
			plugins: [
				function fnPlugin(resolver) {
					called = true;
					expect(resolver).toBeDefined();
				},
			],
		});
		expect(called).toBe(true);
	});
});
