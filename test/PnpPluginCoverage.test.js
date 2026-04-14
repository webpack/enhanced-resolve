"use strict";

/* eslint-disable jsdoc/reject-any-type */

const { AsyncSeriesBailHook } = require("tapable");
const PnpPlugin = require("../lib/PnpPlugin");

describe("PnpPlugin coverage gaps", () => {
	it("logs and falls through when pnpApi rejects as UNDECLARED_DEPENDENCY", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpLog",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpLogTarget",
		);
		const alternate = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpLogAlt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("should not be called");
			},
		});
		const plugin = new PnpPlugin(
			source,
			{
				resolveToUnqualified() {
					const err =
						/** @type {Error & { code: string, pnpCode: string }} */
						(new Error("line1\nline2"));
					err.code = "MODULE_NOT_FOUND";
					err.pnpCode = "UNDECLARED_DEPENDENCY";
					throw err;
				},
			},
			target,
			alternate,
		);
		plugin.apply(resolver);

		const logs = [];
		source.callAsync(
			/** @type {any} */ ({ path: "/p", request: "pkg/sub" }),
			{ log: (m) => logs.push(m) },
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				// The summary and each log line should be present.
				expect(logs[0]).toBe("request is not managed by the pnpapi");
				expect(logs.length).toBeGreaterThan(1);
				done();
			},
		);
	});

	it("propagates non-pnp errors from pnpApi.resolveToUnqualified", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpErr",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpErrTarget",
		);
		const alternate = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpErrAlt",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("should not be called");
			},
		});
		const plugin = new PnpPlugin(
			source,
			{
				resolveToUnqualified() {
					throw new Error("unexpected");
				},
			},
			target,
			alternate,
		);
		plugin.apply(resolver);

		source.callAsync(
			/** @type {any} */ ({ path: "/p", request: "pkg/sub" }),
			{},
			(err) => {
				expect(err).toBeTruthy();
				expect(err.message).toBe("unexpected");
				done();
			},
		);
	});

	it("returns null when pnpApi returns null and the alternate target fails", (done) => {
		// Fake resolver stubs to exercise the alternateTarget null branch
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpSource",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpTarget",
		);
		const alternateTarget = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpAlt",
		);
		const hookMap = new Map([
			[source.name, source],
			[target.name, target],
			[alternateTarget.name, alternateTarget],
		]);
		const doResolveCalls = [];
		const resolver = /** @type {any} */ ({
			ensureHook: (name) =>
				typeof name === "string" ? hookMap.get(name) || source : name,
			getHook: (name) => (typeof name === "string" ? hookMap.get(name) : name),
			doResolve(hook, req, msg, ctx, cb) {
				doResolveCalls.push(hook.name);
				// Every doResolve to alternateTarget returns no result.
				return cb(null, null);
			},
		});

		const plugin = new PnpPlugin(
			source,
			{
				resolveToUnqualified: () => null,
			},
			target,
			alternateTarget,
		);
		plugin.apply(resolver);

		source.callAsync(
			/** @type {any} */ ({ path: "/p", request: "pkg/sub" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeNull();
				expect(doResolveCalls).toEqual(["pnpAlt"]);
				done();
			},
		);
	});

	it("continues to next plugin when pnp resolution equals the packageName", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpSource2",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpTarget2",
		);
		const alternateTarget = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpAlt2",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("should not be called");
			},
		});
		const plugin = new PnpPlugin(
			source,
			{
				resolveToUnqualified: (pkg) => pkg,
			},
			target,
			alternateTarget,
		);
		plugin.apply(resolver);

		source.callAsync(
			/** @type {any} */ ({ path: "/p", request: "pkg" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				done();
			},
		);
	});

	it("skips plugins when the request is absent or not a package specifier", (done) => {
		const source = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpSource3",
		);
		const target = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpTarget3",
		);
		const alternateTarget = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"pnpAlt3",
		);
		const resolver = /** @type {any} */ ({
			ensureHook: (h) => h,
			getHook: (h) => h,
			doResolve() {
				throw new Error("should not be called");
			},
		});
		const plugin = new PnpPlugin(
			source,
			{
				resolveToUnqualified: () => {
					throw new Error("should not be called");
				},
			},
			target,
			alternateTarget,
		);
		plugin.apply(resolver);

		// request is empty → fall through
		source.callAsync(
			/** @type {any} */ ({ path: "/p", request: "" }),
			{},
			(err, result) => {
				expect(err).toBeFalsy();
				expect(result).toBeUndefined();
				// request starts with "/" → packageMatch fails → fall through
				source.callAsync(
					/** @type {any} */ ({ path: "/p", request: "/abs" }),
					{},
					(err2, result2) => {
						expect(err2).toBeFalsy();
						expect(result2).toBeUndefined();
						done();
					},
				);
			},
		);
	});
});
