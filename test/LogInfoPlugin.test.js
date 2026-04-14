"use strict";

/* eslint-disable jsdoc/reject-any-type */

const fs = require("fs");
const path = require("path");
const { AsyncSeriesBailHook } = require("tapable");
const { ResolverFactory } = require("../");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const LogInfoPlugin = require("../lib/LogInfoPlugin");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("LogInfoPlugin", () => {
	it("should be constructible and retain the source", () => {
		const plugin = new LogInfoPlugin("resolve");
		expect(plugin).toBeInstanceOf(LogInfoPlugin);
		expect(plugin.source).toBe("resolve");
	});

	it("should not log when resolveContext.log is not provided", (done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
		});

		new LogInfoPlugin("resolve").apply(resolver);

		// This resolution won't produce a log message (no log fn).
		resolver.resolve({}, fixtures, "./a.js", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toBeTruthy();
			done();
		});
	});

	it("should log each request field exactly once when present", (done) => {
		const hook = new AsyncSeriesBailHook(["request", "resolveContext"], "test");
		// Minimal resolver-like object that supports getHook
		const resolverStub = /** @type {any} */ ({
			getHook: () => hook,
		});

		new LogInfoPlugin("test").apply(resolverStub);

		const log = [];
		hook.callAsync(
			/** @type {any} */ ({
				path: "/some/path",
				request: "./foo",
				query: "?bar",
				fragment: "#baz",
				module: true,
				directory: true,
				descriptionFilePath: "/some/path/package.json",
				relativePath: "./foo",
			}),
			{ log: (msg) => log.push(msg) },
			(err) => {
				if (err) return done(err);
				const joined = log.join("\n");
				expect(joined).toMatch("Resolving in directory: /some/path");
				expect(joined).toMatch("Resolving request: ./foo");
				expect(joined).toMatch("Request is an module request.");
				expect(joined).toMatch("Request is a directory request.");
				expect(joined).toMatch("Resolving request query: ?bar");
				expect(joined).toMatch("Resolving request fragment: #baz");
				expect(joined).toMatch(
					"Has description data from /some/path/package.json",
				);
				expect(joined).toMatch("Relative path from description file is: ./foo");
				done();
			},
		);
	});

	it("should skip logging branches when fields are absent", (done) => {
		const hook = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"test2",
		);
		const resolverStub = /** @type {any} */ ({ getHook: () => hook });

		new LogInfoPlugin("test2").apply(resolverStub);

		const log = [];
		// Provide a request with no optional fields populated.
		hook.callAsync(
			/** @type {any} */ ({}),
			{ log: (msg) => log.push(msg) },
			(err) => {
				if (err) return done(err);
				expect(log).toEqual([]);
				done();
			},
		);
	});

	it("early-returns when resolveContext has no log", (done) => {
		const hook = new AsyncSeriesBailHook(
			["request", "resolveContext"],
			"test3",
		);
		const resolverStub = /** @type {any} */ ({ getHook: () => hook });
		new LogInfoPlugin("test3").apply(resolverStub);

		hook.callAsync(
			/** @type {any} */ ({ path: "/x", request: "./y" }),
			{},
			(err) => {
				expect(err).toBeFalsy();
				done();
			},
		);
	});
});
