"use strict";

const fs = require("fs");
const path = require("path");
const { CachedInputFileSystem, ResolverFactory, StackEntry } = require("../");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const fixture = path.resolve(__dirname, "fixtures", "extensions");

describe("resolveContext.stack", () => {
	const resolver = ResolverFactory.createResolver({
		extensions: [".ts", ".js"],
		fileSystem: nodeFileSystem,
	});

	it("should resolve when no stack is supplied", (done) => {
		resolver.resolve({}, fixture, "./foo", {}, (err, result) => {
			if (err) return done(err);
			expect(result).toBeTruthy();
			done();
		});
	});

	it("should resolve when an empty StackEntry is supplied as stack", (done) => {
		resolver.resolve(
			{},
			fixture,
			"./foo",
			{ stack: new StackEntry() },
			(err, result) => {
				if (err) return done(err);
				expect(result).toBeTruthy();
				done();
			},
		);
	});

	it("should resolve when a non-empty Set is supplied as stack", (done) => {
		// The values below are arbitrary tokens that must not collide with any
		// real `resolve` step. Providing them exercises the code path where a
		// caller pre-seeds the recursion-tracking stack.
		resolver.resolve(
			{},
			fixture,
			"./foo",
			{ stack: new StackEntry(["custom-entry-1", "custom-entry-2"]) },
			(err, result) => {
				if (err) return done(err);
				expect(result).toBeTruthy();
				done();
			},
		);
	});

	it("should detect recursion against entries pre-seeded in the stack", (done) => {
		// The first stack entry that `resolve` pushes for this request is
		// `resolve: (…fixture…) ./foo`. Pre-seeding an identical string in
		// the context must trigger the recursion guard and abort the resolve.
		const preSeededEntry = `resolve: (${fixture}) ./foo`;
		resolver.resolve(
			{},
			fixture,
			"./foo",
			{ stack: new StackEntry([preSeededEntry]) },
			(err) => {
				expect(err).toBeTruthy();
				expect(
					/** @type {Error & { recursion?: boolean }} */ (err).recursion,
				).toBe(true);
				done();
			},
		);
	});

	it("should detect recursion against entries pre-seeded in the stack (old Set API)", (done) => {
		// The first stack entry that `resolve` pushes for this request is
		// `resolve: (…fixture…) ./foo`. Pre-seeding an identical string in
		// the context must trigger the recursion guard and abort the resolve.
		const preSeededEntry = `resolve: (${fixture}) ./foo`;
		resolver.resolve(
			{},
			fixture,
			"./foo",
			// @ts-expect-error for test cases old Set API
			{ stack: new Set([preSeededEntry]) },
			(err) => {
				expect(err).toBeTruthy();
				expect(
					/** @type {Error & { recursion?: boolean }} */ (err).recursion,
				).toBe(true);
				done();
			},
		);
	});
});
