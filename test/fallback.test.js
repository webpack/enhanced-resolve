"use strict";

const { Volume } = require("memfs");
const { ResolverFactory } = require("../");

describe("fallback", () => {
	let resolver;

	beforeEach(() => {
		const fileSystem = Volume.fromJSON(
			{
				"/a/index": "",
				"/a/dir/index": "",
				"/recursive/index": "",
				"/recursive/dir/index": "",
				"/recursive/dir/file": "",
				"/recursive/dir/dir/index": "",
				"/b/index": "",
				"/b/dir/index": "",
				"/c/index": "",
				"/c/dir/index": "",
				"/d/index.js": "",
				"/d/dir/.empty": "",
				"/e/index": "",
				"/e/anotherDir/index": "",
				"/e/dir/file": "",
			},
			"/",
		);
		resolver = ResolverFactory.createResolver({
			fallback: {
				aliasA: "a",
				b$: "a/index",
				c$: "/a/index",
				multiAlias: ["b", "c", "d", "e", "a"],
				recursive: "recursive/dir",
				"/d/dir": "/c/dir",
				"/d/index.js": "/c/index",
				ignored: false,
			},
			modules: "/",
			useSyncFileSystemCalls: true,
			// @ts-expect-error for test
			fileSystem,
		});
	});

	it("should resolve a not aliased module", async () => {
		expect(await resolver.resolvePromise({}, "/", "a")).toBe("/a/index");
		expect(await resolver.resolvePromise({}, "/", "a/index")).toBe("/a/index");
		expect(await resolver.resolvePromise({}, "/", "a/dir")).toBe(
			"/a/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "a/dir/index")).toBe(
			"/a/dir/index",
		);
	});

	it("should resolve an fallback module", async () => {
		expect(await resolver.resolvePromise({}, "/", "aliasA")).toBe("/a/index");
		expect(await resolver.resolvePromise({}, "/", "aliasA/index")).toBe(
			"/a/index",
		);
		expect(await resolver.resolvePromise({}, "/", "aliasA/dir")).toBe(
			"/a/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "aliasA/dir/index")).toBe(
			"/a/dir/index",
		);
	});

	it("should resolve an ignore module", async () => {
		expect(await resolver.resolvePromise({}, "/", "ignored")).toBe(false);
	});

	it("should resolve a recursive aliased module", async () => {
		expect(await resolver.resolvePromise({}, "/", "recursive")).toBe(
			"/recursive/index",
		);
		expect(await resolver.resolvePromise({}, "/", "recursive/index")).toBe(
			"/recursive/index",
		);
		expect(await resolver.resolvePromise({}, "/", "recursive/dir")).toBe(
			"/recursive/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "recursive/dir/index")).toBe(
			"/recursive/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "recursive/file")).toBe(
			"/recursive/dir/file",
		);
	});

	it("should resolve a file aliased module with a query", async () => {
		expect(await resolver.resolvePromise({}, "/", "b?query")).toBe(
			"/b/index?query",
		);
		expect(await resolver.resolvePromise({}, "/", "c?query")).toBe(
			"/c/index?query",
		);
	});

	it("should resolve a path in a file aliased module", async () => {
		expect(await resolver.resolvePromise({}, "/", "b/index")).toBe("/b/index");
		expect(await resolver.resolvePromise({}, "/", "b/dir")).toBe(
			"/b/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "b/dir/index")).toBe(
			"/b/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "c/index")).toBe("/c/index");
		expect(await resolver.resolvePromise({}, "/", "c/dir")).toBe(
			"/c/dir/index",
		);
		expect(await resolver.resolvePromise({}, "/", "c/dir/index")).toBe(
			"/c/dir/index",
		);
	});

	it("should resolve a file in multiple aliased dirs", async () => {
		expect(await resolver.resolvePromise({}, "/", "multiAlias/dir/file")).toBe(
			"/e/dir/file",
		);
		expect(
			await resolver.resolvePromise({}, "/", "multiAlias/anotherDir"),
		).toBe("/e/anotherDir/index");
	});

	it("should log the correct info", (done) => {
		const log = [];
		resolver.resolve(
			{},
			"/",
			"aliasA/dir",
			{ log: (v) => log.push(v) },
			(err, result) => {
				if (err) return done(err);
				expect(result).toBe("/a/dir/index");
				expect(log).toMatchSnapshot();
				done();
			},
		);
	});
});
