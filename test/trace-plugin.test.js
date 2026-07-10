"use strict";

const assert = require("assert");
const fs = require("fs");

const path = require("path");
const { CachedInputFileSystem, ResolverFactory, TracePlugin } = require("../");
const { describe, it } = require("./_runner");

const fixtures = path.join(__dirname, "fixtures");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("TracePlugin", () => {
	it("records trace entries for a successful resolve", (t, done) => {
		const trace = TracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new TracePlugin(trace)],
		});

		resolver.resolve({}, fixtures, "./a.js", {}, (err, result) => {
			if (err) return done(err);
			assert.ok(result);
			const entries = trace.getEntries();
			assert.ok(entries.length > 0);
			done();
		});
	});

	it("each entry has hook, request, result, and timestamp", (t, done) => {
		const trace = TracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new TracePlugin(trace)],
		});

		resolver.resolve({}, fixtures, "./a.js", {}, (err) => {
			if (err) return done(err);
			const entries = trace.getEntries();
			for (const entry of entries) {
				assert.strictEqual(typeof entry.hook, "string");
				assert.ok(entry.request);
				assert.strictEqual(typeof entry.request.path, "string");
				assert.strictEqual(typeof entry.request.request, "string");
				assert.strictEqual(typeof entry.request.query, "string");
				assert.strictEqual(typeof entry.request.fragment, "string");
				assert.strictEqual(typeof entry.request.module, "boolean");
				assert.strictEqual(typeof entry.request.directory, "boolean");
				assert.strictEqual(typeof entry.timestamp, "number");
				assert.ok(entry.timestamp > 0);
			}
			done();
		});
	});

	it("includes a result entry with the resolved path", (t, done) => {
		const trace = TracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new TracePlugin(trace)],
		});

		resolver.resolve({}, fixtures, "./a.js", {}, (err, _result) => {
			if (err) return done(err);
			const entries = trace.getEntries();
			const resultEntry = entries.find((entry) => entry.hook === "result");
			assert.ok(resultEntry);
			assert.strictEqual(resultEntry.result, path.join(fixtures, "a.js"));
			done();
		});
	});

	it("records module flag for bare module requests", (t, done) => {
		const trace = TracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new TracePlugin(trace)],
		});

		resolver.resolve({}, fixtures, "m1/a", {}, (err, _result) => {
			if (err) return done(err);
			assert.ok(_result);
			const entries = trace.getEntries();
			const moduleEntry = entries.find((entry) => entry.request.module);
			assert.ok(moduleEntry, "expected at least one entry with module=true");
			done();
		});
	});

	it("records directory flag for directory requests", (t, done) => {
		const trace = TracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new TracePlugin(trace)],
		});

		resolver.resolve({}, fixtures, "./main-field-self/", {}, (err, _result) => {
			if (err) return done(err);
			assert.ok(_result);
			const entries = trace.getEntries();
			const dirEntry = entries.find((entry) => entry.request.directory);
			assert.ok(dirEntry, "expected at least one entry with directory=true");
			done();
		});
	});

	it("collector.clear() removes all entries", (t, done) => {
		const trace = TracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new TracePlugin(trace)],
		});

		resolver.resolve({}, fixtures, "./a.js", {}, (err) => {
			if (err) return done(err);
			assert.ok(trace.getEntries().length > 0);
			trace.clear();
			assert.strictEqual(trace.getEntries().length, 0);
			done();
		});
	});

	it("entries have timestamps that are non-decreasing", (t, done) => {
		const trace = TracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new TracePlugin(trace)],
		});

		resolver.resolve({}, fixtures, "./a.js", {}, (err) => {
			if (err) return done(err);
			const entries = trace.getEntries();
			for (let i = 1; i < entries.length; i++) {
				assert.ok(
					entries[i].timestamp >= entries[i - 1].timestamp,
					`entry ${i} timestamp should be >= entry ${i - 1}`,
				);
			}
			done();
		});
	});

	it("works with resolveSync", () => {
		const trace = TracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			useSyncFileSystemCalls: true,
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new TracePlugin(trace)],
		});

		const result = resolver.resolveSync({}, fixtures, "./a.js");
		assert.ok(result);
		const entries = trace.getEntries();
		assert.ok(entries.length > 0);
		const resultEntry = entries.find((entry) => entry.hook === "result");
		assert.ok(resultEntry);
		assert.strictEqual(resultEntry.result, path.join(fixtures, "a.js"));
	});

	it("works with resolvePromise", async () => {
		const trace = TracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new TracePlugin(trace)],
		});

		const result = await resolver.resolvePromise({}, fixtures, "./a.js");
		assert.ok(result);
		const entries = trace.getEntries();
		assert.ok(entries.length > 0);
		const resultEntry = entries.find((entry) => entry.hook === "result");
		assert.ok(resultEntry);
		assert.strictEqual(resultEntry.result, path.join(fixtures, "a.js"));
	});

	it("captured from the index export", (t, done) => {
		const { TracePlugin: IndexTracePlugin } = require("../");

		const trace = IndexTracePlugin.createCollector();
		const resolver = ResolverFactory.createResolver({
			fileSystem: nodeFileSystem,
			extensions: [".js"],
			plugins: [new IndexTracePlugin(trace)],
		});

		resolver.resolve({}, fixtures, "./a.js", {}, (err, result) => {
			if (err) return done(err);
			assert.ok(result);
			assert.ok(trace.getEntries().length > 0);
			done();
		});
	});
});
