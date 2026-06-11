"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const LogInfoPlugin = require("../lib/LogInfoPlugin");
const { describe, it } = require("./_runner");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("LogInfoPlugin", () => {
	it("logs resolution steps when a log function is provided", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new LogInfoPlugin("resolve")],
		});

		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./a.js",
			{ log: (m) => log.push(m) },
			(err) => {
				if (err) return done(err);
				assert.ok(log.length > 0);
				assert.strictEqual(
					log.some((l) => l.includes("[resolve]")),
					true,
				);
				done();
			},
		);
	});

	it("logs query and fragment when present in the request", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new LogInfoPlugin("normal-resolve")],
		});

		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./a.js?query#frag",
			{ log: (m) => log.push(m) },
			(err) => {
				if (err) return done(err);
				assert.strictEqual(
					log.some((l) => l.includes("Resolving request query: ?query")),
					true,
				);
				assert.strictEqual(
					log.some((l) => l.includes("Resolving request fragment: #frag")),
					true,
				);
				done();
			},
		);
	});

	it("logs a module request marker when resolving a module request", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			plugins: [new LogInfoPlugin("normal-resolve")],
		});

		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"m1/a",
			{ log: (m) => log.push(m) },
			(err) => {
				if (err) return done(err);
				assert.strictEqual(
					log.some((l) => l.includes("Request is an module request.")),
					true,
				);
				assert.strictEqual(
					log.some((l) => l.includes("Has description data from")),
					true,
				);
				assert.strictEqual(
					log.some((l) =>
						l.includes("Relative path from description file is:"),
					),
					true,
				);
				done();
			},
		);
	});

	it("logs a directory marker when resolving a directory request", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			plugins: [new LogInfoPlugin("normal-resolve")],
		});

		const log = [];
		resolver.resolve(
			{},
			fixtures,
			"./main-field-self/",
			{ log: (m) => log.push(m) },
			(err) => {
				if (err) return done(err);
				assert.strictEqual(
					log.some((l) => l.includes("Request is a directory request.")),
					true,
				);
				done();
			},
		);
	});

	it("does not log when no log function is provided", (t, done) => {
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new LogInfoPlugin("resolve")],
		});

		// This resolve should succeed without errors even though no log is provided.
		resolver.resolve({}, fixtures, "./a.js", {}, (err, result) => {
			if (err) return done(err);
			assert.ok(result);
			done();
		});
	});
});
