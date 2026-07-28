"use strict";

const assert = require("assert");
const { ResolverFactory } = require("../");
const { describe, it } = require("./_runner");

// UNC paths (`\\server\share\…`) are Windows-only constructs addressing a
// network share, so a real one cannot be mounted in CI. The resolver picks the
// path flavor from the path itself rather than from the host, so a fake
// filesystem exercises the same code paths on every platform.
const share = "\\\\server\\share\\a";

const files = new Map([
	[`${share}\\package.json`, '{"main":"./main.js"}'],
	[`${share}\\main.js`, "module.exports = 1;"],
	[`${share}\\sub\\index.js`, "module.exports = 2;"],
]);

const directories = new Set([
	"\\\\server\\share",
	share,
	`${share}\\sub`,
	`${share}\\node_modules`,
]);

const createFileSystem = () => {
	const enoent = (requested) => {
		const err = /** @type {NodeJS.ErrnoException} */ (
			new Error(`ENOENT: no such file or directory, '${requested}'`)
		);
		err.code = "ENOENT";
		throw err;
	};
	const fileSystem = {
		statSync: (requested) => {
			const isFile = files.has(requested);
			if (!isFile && !directories.has(requested)) return enoent(requested);
			return {
				isFile: () => isFile,
				isDirectory: () => !isFile,
				isSymbolicLink: () => false,
			};
		},
		lstatSync: (requested) => fileSystem.statSync(requested),
		readFileSync: (requested) => {
			const content = files.get(requested);
			return content === undefined ? enoent(requested) : content;
		},
		readdirSync: enoent,
		readlinkSync: enoent,
	};
	return fileSystem;
};

const createResolver = () =>
	ResolverFactory.createResolver({
		extensions: [".js"],
		useSyncFileSystemCalls: true,
		// @ts-expect-error a minimal filesystem is enough for these cases
		fileSystem: createFileSystem(),
	});

describe("UNC path resolution", () => {
	it("should resolve a relative request against a UNC context", (t, done) => {
		createResolver().resolve(
			{},
			`${share}\\sub`,
			"./index.js",
			{},
			(err, result) => {
				if (err) return done(err);
				assert.strictEqual(result, `${share}\\sub\\index.js`);
				done();
			},
		);
	});

	it("should resolve a directory request against a UNC context", (t, done) => {
		createResolver().resolve({}, share, "./sub/index.js", {}, (err, result) => {
			if (err) return done(err);
			assert.strictEqual(result, `${share}\\sub\\index.js`);
			done();
		});
	});

	it("should treat an absolute UNC request as a path, not a module", (t, done) => {
		createResolver().resolve(
			{},
			"/somewhere/else",
			`${share}\\sub\\index.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				assert.strictEqual(result, `${share}\\sub\\index.js`);
				done();
			},
		);
	});

	it("should use the description file of a UNC directory", (t, done) => {
		createResolver().resolve({}, share, ".", {}, (err, result) => {
			if (err) return done(err);
			assert.strictEqual(result, `${share}\\main.js`);
			done();
		});
	});
});
