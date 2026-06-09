"use strict";

const ResolverFactory = require("../lib/ResolverFactory");

// Regression test: a file system that returns Uint8Array (as a browser/Deno FS
// would) instead of a Node Buffer must still have its package.json description
// files parsed. Previously DescriptionFileUtils called `content.toString()`,
// which stringifies a Uint8Array to a comma-separated byte list.
describe("Uint8Array file system", () => {
	const fileMap = {
		"/app/index.js": "",
		"/app/node_modules/pkg/package.json": JSON.stringify({
			name: "pkg",
			main: "lib/main.js",
			exports: { ".": "./lib/main.js", "./feature": "./lib/feature.js" },
		}),
		"/app/node_modules/pkg/lib/main.js": "",
		"/app/node_modules/pkg/lib/feature.js": "",
	};

	const files = new Map(Object.entries(fileMap));
	const dirs = new Set(["/"]);
	for (const filePath of files.keys()) {
		let dir = filePath;
		let idx = dir.lastIndexOf("/");
		while (idx > 0) {
			dir = dir.slice(0, idx);
			dirs.add(dir);
			idx = dir.lastIndexOf("/");
		}
	}

	const stat = (isFile) => ({
		isFile: () => isFile,
		isDirectory: () => !isFile,
		isSymbolicLink: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false,
		isFIFO: () => false,
		isSocket: () => false,
	});

	const enoent = (p) => {
		const err = /** @type {NodeJS.ErrnoException} */ (
			new Error(`ENOENT: ${p}`)
		);
		err.code = "ENOENT";
		return err;
	};

	const statSync = (arg) => {
		const p = String(arg);
		if (files.has(p)) return stat(true);
		if (dirs.has(p)) return stat(false);
		throw enoent(p);
	};

	const fileSystem = {
		statSync,
		lstatSync: statSync,
		realpathSync: (arg) => `${arg}`,
		readlinkSync: () => {
			const err = /** @type {NodeJS.ErrnoException} */ (new Error("EINVAL"));
			err.code = "EINVAL";
			throw err;
		},
		readdirSync: () => [],
		// The crux of the test: return a Uint8Array, never a Node Buffer.
		readFileSync: (arg) => {
			const p = String(arg);
			if (!files.has(p)) throw enoent(p);
			return new TextEncoder().encode(files.get(p));
		},
	};

	const resolver = ResolverFactory.createResolver({
		extensions: [".js", ".json"],
		conditionNames: ["node", "import"],
		// @ts-expect-error minimal structural file system for the test
		fileSystem,
		useSyncFileSystemCalls: true,
	});

	it("resolves a package main field read from a Uint8Array package.json", () => {
		expect(resolver.resolveSync({}, "/app", "pkg")).toBe(
			"/app/node_modules/pkg/lib/main.js",
		);
	});

	it("resolves an exports subpath read from a Uint8Array package.json", () => {
		expect(resolver.resolveSync({}, "/app", "pkg/feature")).toBe(
			"/app/node_modules/pkg/lib/feature.js",
		);
	});
});
