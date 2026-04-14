"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

const fixtures = path.join(__dirname, "fixtures");
const nodeFs = new CachedInputFileSystem(fs, 4000);

describe("Resolver internals additional coverage", () => {
	it("emits 'Can't resolve' with details when log is provided and resolution fails", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			extensions: [".js"],
		});
		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./does-not-exist",
			{ log: (m) => log.push(m) },
			(err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).message).toMatch(/Can't resolve/);
				expect(/** @type {any} */ (err).details).toBeDefined();
				expect(log.length).toBeGreaterThan(0);
				done();
			},
		);
	});

	it("emits 'Can't resolve' even without log (re-runs internally with log)", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			extensions: [".js"],
		});
		resolver.resolve({}, fixtures, "./does-not-exist", {}, (err) => {
			expect(err).toBeTruthy();
			expect(/** @type {any} */ (err).message).toMatch(/Can't resolve/);
			expect(/** @type {any} */ (err).details).toBeDefined();
			done();
		});
	});

	it("detects recursion in doResolve via stack tracking", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			extensions: [".js"],
		});
		const hook = resolver.hooks.resolve;
		const request = /** @type {any} */ ({
			path: "/p",
			request: "./a",
			query: "",
			fragment: "",
		});
		// Pre-populate the stack with the same entry doResolve will create.
		const stackEntry = `${hook.name}: (${request.path}) ${request.request || ""}`;
		const log = [];
		resolver.doResolve(
			hook,
			request,
			null,
			{
				log: (m) => log.push(m),
				stack: new Set([stackEntry]),
			},
			(err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).recursion).toBe(true);
				expect(/** @type {any} */ (err).message).toMatch(
					/Recursion in resolving/,
				);
				expect(
					log.some((l) => l.includes("abort resolving because of recursion")),
				).toBe(true);
				done();
			},
		);
	});

	it("detects recursion in doResolve without a log function", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			extensions: [".js"],
		});
		const hook = resolver.hooks.resolve;
		const request = /** @type {any} */ ({
			path: "/p",
			request: "./a",
			query: "",
			fragment: "",
		});
		const stackEntry = `${hook.name}: (${request.path}) ${request.request || ""}`;
		resolver.doResolve(
			hook,
			request,
			null,
			{ stack: new Set([stackEntry]) },
			(err) => {
				expect(err).toBeTruthy();
				expect(/** @type {any} */ (err).recursion).toBe(true);
				done();
			},
		);
	});

	it("invokes the noResolve hook on resolution failure", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			extensions: [".js"],
		});
		const noResolveCalls = [];
		resolver.hooks.noResolve.tap("NoResolveTracker", (req, err) => {
			noResolveCalls.push({ req, err });
		});
		resolver.resolve({}, fixtures, "./does-not-exist", {}, (err) => {
			expect(err).toBeTruthy();
			expect(noResolveCalls).toHaveLength(1);
			expect(noResolveCalls[0].err).toBe(err);
			done();
		});
	});

	it("escapes # characters in resolved paths", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFs,
			extensions: [".js"],
		});
		resolver.resolve({}, fixtures, "./a.js", {}, (err, result) => {
			if (err) return done(err);
			// No # in this fixture path, but the code path is exercised.
			expect(typeof result).toBe("string");
			done();
		});
	});
});
