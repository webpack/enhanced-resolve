const path = require("path");
const fs = require("fs");

const CachedInputFileSystem = require("../lib/CachedInputFileSystem");
const ResolverFactory = require("../lib/ResolverFactory");

const { obps, transferPathToPosix } = require("./util/path-separator");

/** @typedef {import("../lib/util/entrypoints").ImportsField} ImportsField */

describe("extension-alias", () => {
	const fixture = path.resolve(__dirname, "fixtures", "extension-alias");
	const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		extensions: [".js"],
		fileSystem: nodeFileSystem,
		mainFiles: ["index.js"],
		extensionAlias: {
			".js": [".ts", ".js"],
			".mjs": ".mts"
		}
	});

	it("should alias fully specified file", done => {
		resolver.resolve({}, fixture, `.${obps}index.js`, {}, (err, result) => {
			if (err) return done(err);
			expect(result).toEqual(
				transferPathToPosix(path.resolve(fixture, "index.ts"))
			);
			done();
		});
	});

	it("should alias fully specified file when there are two alternatives", done => {
		resolver.resolve(
			{},
			fixture,
			`.${obps}dir${obps}index.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixture, "dir", "index.ts"))
				);
				done();
			}
		);
	});

	it("should also allow the second alternative", done => {
		resolver.resolve(
			{},
			fixture,
			`.${obps}dir2${obps}index.js`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixture, "dir2", "index.js"))
				);
				done();
			}
		);
	});

	it("should support alias option without an array", done => {
		resolver.resolve(
			{},
			fixture,
			`.${obps}dir2${obps}index.mjs`,
			{},
			(err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixture, "dir2", "index.mts"))
				);
				done();
			}
		);
	});

	it("should not allow to fallback to the original extension or add extensions", done => {
		resolver.resolve({}, fixture, `.${obps}index.mjs`, {}, (err, result) => {
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	describe("should not apply extension alias to extensions or mainFiles field", () => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index.js"],
			extensionAlias: {
				".js": []
			}
		});

		it("directory", done => {
			resolver.resolve({}, fixture, `.${obps}dir2`, {}, (err, result) => {
				if (err) return done(err);
				expect(result).toEqual(
					transferPathToPosix(path.resolve(fixture, "dir2", "index.js"))
				);
				done();
			});
		});

		it("file", done => {
			resolver.resolve(
				{},
				fixture,
				`.${obps}dir2${obps}index`,
				{},
				(err, result) => {
					if (err) return done(err);
					expect(result).toEqual(
						transferPathToPosix(path.resolve(fixture, "dir2", "index.js"))
					);
					done();
				}
			);
		});
	});
});
