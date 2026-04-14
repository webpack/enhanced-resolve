"use strict";

/* eslint-disable jsdoc/reject-any-type */

const { AsyncSeriesBailHook } = require("tapable");
const AliasPlugin = require("../lib/AliasPlugin");
const ExtensionAliasPlugin = require("../lib/ExtensionAliasPlugin");
const PnpPlugin = require("../lib/PnpPlugin");
const RestrictionsPlugin = require("../lib/RestrictionsPlugin");

describe("PnpPlugin additional error paths", () => {
	it("propagates errors from the alternate target", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpAS",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpAT",
		);
		const alternate = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpAA",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(hook, _r, _m, _c, cb) {
				if (hook === alternate) return cb(new Error("alt-fail"));
				cb();
			},
		});
		const plugin = new PnpPlugin(
			source,
			{ resolveToUnqualified: () => null },
			target,
			alternate,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ path: "/p", request: "pkg/sub" }),
			{},
			(err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).message).toBe("alt-fail");
				done();
			},
		);
	});

	it("forwards alternate target results", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpBS",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpBT",
		);
		const alternate = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpBA",
		);
		const finalRequest = /** @type {any} */ ({ path: "/found" });
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(hook, _r, _m, _c, cb) {
				if (hook === alternate) return cb(null, finalRequest);
				cb();
			},
		});
		const plugin = new PnpPlugin(
			source,
			{ resolveToUnqualified: () => null },
			target,
			alternate,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ path: "/p", request: "pkg/sub" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBe(finalRequest);
				done();
			},
		);
	});

	it("propagates errors from the resolved target", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpCS",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpCT",
		);
		const alternate = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpCA",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(hook, _r, _m, _c, cb) {
				if (hook === target) return cb(new Error("tgt-fail"));
				cb();
			},
		});
		const plugin = new PnpPlugin(
			source,
			{ resolveToUnqualified: () => "/resolved/pkg" },
			target,
			alternate,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ path: "/p", request: "pkg/sub" }),
			{},
			(err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).message).toBe("tgt-fail");
				done();
			},
		);
	});

	it("returns null when target resolution yields no result", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpDS",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpDT",
		);
		const alternate = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpDA",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(_hook, _r, _m, _c, cb) {
				cb(null, null);
			},
		});
		const plugin = new PnpPlugin(
			source,
			{ resolveToUnqualified: () => "/resolved/pkg" },
			target,
			alternate,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ path: "/p", request: "pkg/sub" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeNull();
				done();
			},
		);
	});
});

describe("ExtensionAliasPlugin", () => {
	it("falls through when request doesn't end with the configured extension", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"eaAS",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"eaAT",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("should not be called");
			},
		});
		const plugin = new ExtensionAliasPlugin(
			source,
			{ extension: ".js", alias: ".ts" },
			target,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ request: "./foo.css" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("logs each alias attempt failure when alias is an array (multiple aliases)", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"eaBS",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"eaBT",
		);
		// Three aliases: first two error, last one fails too.
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(_h, _r, _m, _c, cb) {
				cb(new Error("alias-fail"));
			},
		});
		const plugin = new ExtensionAliasPlugin(
			source,
			{ extension: ".js", alias: [".ts", ".tsx", ".jsx"] },
			target,
		);
		plugin.apply(resolver);
		const logs = [];
		source.callAsync(
			/** @type {any} */ ({ request: "./foo.js" }),
			{ log: (m) => logs.push(m) },
			(err) => {
				expect(err).toBeTruthy();
				// Should have logged failures for the first two aliases.
				expect(
					logs.some((l) => l.includes("Failed to alias from extension alias")),
				).toBe(true);
				done();
			},
		);
	});

	it("uses single alias path when alias array has one entry", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"eaCS",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"eaCT",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(_h, req, _m, _c, cb) {
				cb(null, req);
			},
		});
		const plugin = new ExtensionAliasPlugin(
			source,
			{ extension: ".js", alias: [".ts"] },
			target,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ request: "./foo.js" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(/** @type {any} */ (result).request).toBe("./foo.ts");
				done();
			},
		);
	});
});

describe("AliasPlugin and AliasUtils additional", () => {
	it("falls through when both request.request and request.path are missing", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasGuard",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasGuardT",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("should not be called");
			},
		});
		const plugin = new AliasPlugin(source, { name: "x", alias: "/y" }, target);
		plugin.apply(resolver);
		source.callAsync(/** @type {any} */ ({}), {}, (err, result) => {
			expect(err).toBeFalsy();
			expect(result).toBeUndefined();
			done();
		});
	});

	it("yields when alias is false and yield is provided", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasFalseSrc",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasFalseTgt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("should not be called");
			},
		});
		const plugin = new AliasPlugin(
			source,
			{ name: "ignored", alias: false },
			target,
		);
		plugin.apply(resolver);
		const yielded = [];
		source.callAsync(
			/** @type {any} */ ({ request: "ignored", path: "/p" }),
			{ yield: (r) => yielded.push(r) },
			(err) => {
				expect(err).toBeFalsy();
				expect(yielded).toHaveLength(1);
				expect(yielded[0].path).toBe(false);
				done();
			},
		);
	});

	it("returns the ignore object when alias is false and no yield is provided", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasFalseSrc2",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasFalseTgt2",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("should not be called");
			},
		});
		const plugin = new AliasPlugin(
			source,
			{ name: "ignored", alias: false },
			target,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ request: "ignored", path: "/p" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(/** @type {any} */ (result).path).toBe(false);
				done();
			},
		);
	});

	it("propagates errors from the inner doResolve (single alias)", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasErrSrc",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasErrTgt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(_h, _r, _m, _c, cb) {
				cb(new Error("inner-fail"));
			},
		});
		const plugin = new AliasPlugin(source, { name: "x", alias: "/y" }, target);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ request: "x/sub", path: "/p" }),
			{},
			(err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).message).toBe("inner-fail");
				done();
			},
		);
	});

	it("supports an array alias (forEachBail) that resolves the second entry", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasArrSrc",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasArrTgt",
		);
		let calls = 0;
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(_h, req, _m, _c, cb) {
				calls++;
				if (calls === 1) return cb();
				cb(null, req);
			},
		});
		const plugin = new AliasPlugin(
			source,
			{ name: "x", alias: ["/a", "/b"] },
			target,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ request: "x/sub", path: "/p" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeTruthy();
				expect(calls).toBe(2);
				done();
			},
		);
	});

	it("matches a wildcard alias name", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasWildSrc",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"aliasWildTgt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve(_h, req, _m, _c, cb) {
				cb(null, req);
			},
		});
		const plugin = new AliasPlugin(
			source,
			{ name: "@scope/*", alias: "/internal/*" },
			target,
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ request: "@scope/foo", path: "/p" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(/** @type {any} */ (result).request).toBe("/internal/foo");
				done();
			},
		);
	});
});

describe("RestrictionsPlugin function-style restriction", () => {
	it("falls through normally when the path is allowed by all restrictions", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"rsfSrc",
		);
		const resolver = /** @type {any} */ ({ getHook: () => source });
		const plugin = new RestrictionsPlugin(
			source,
			new Set(["/allowed", /\.js$/]),
		);
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ path: "/allowed/sub/file.js" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("blocks string restriction without log when none provided", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"rsfSrc2",
		);
		const resolver = /** @type {any} */ ({ getHook: () => source });
		const plugin = new RestrictionsPlugin(source, new Set(["/allowed"]));
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ path: "/elsewhere/x" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeNull();
				done();
			},
		);
	});

	it("blocks regex restriction without log when none provided", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"rsfSrc3",
		);
		const resolver = /** @type {any} */ ({ getHook: () => source });
		const plugin = new RestrictionsPlugin(source, new Set([/\.ts$/]));
		plugin.apply(resolver);
		source.callAsync(
			/** @type {any} */ ({ path: "/x/file.js" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeNull();
				done();
			},
		);
	});
});
