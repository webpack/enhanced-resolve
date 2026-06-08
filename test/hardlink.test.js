"use strict";

const fs = require("fs");
const path = require("path");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const tempPath = path.join(__dirname, "temp-hardlink");

/**
 * Create a resolver with a fresh CachedInputFileSystem to avoid
 * stale stat caches across tests.
 * @param {object} options resolver options
 * @returns {{ resolve: (context: string, request: string, callback: (err: Error | null, result?: string) => void) => void, resolveSync: (context: string, request: string) => string | false }} resolver pair
 */
function createResolvers(options) {
	const fileSystem = new CachedInputFileSystem(fs, 0);
	const asyncResolver = ResolverFactory.createResolver({
		fileSystem,
		...options,
	});
	const syncResolver = ResolverFactory.createResolver({
		fileSystem,
		useSyncFileSystemCalls: true,
		...options,
	});
	return {
		resolve(context, request, callback) {
			asyncResolver.resolve({}, context, request, {}, callback);
		},
		resolveSync(context, request) {
			return syncResolver.resolveSync({}, context, request);
		},
	};
}

describe("hardlink", () => {
	let canHardlink = true;

	// Pre-check: verify we can create hardlinks on this filesystem
	try {
		fs.mkdirSync(tempPath, { recursive: true });
		const testFile = path.join(tempPath, "_probe");
		const testLink = path.join(tempPath, "_probe_link");
		fs.writeFileSync(testFile, "probe");
		fs.linkSync(testFile, testLink);
		const origStat = fs.statSync(testFile);
		const linkStat = fs.statSync(testLink);
		canHardlink = origStat.ino === linkStat.ino && origStat.ino !== 0;
		fs.unlinkSync(testLink);
		fs.unlinkSync(testFile);
		fs.rmSync(tempPath, { recursive: true, force: true });
	} catch (_err) {
		canHardlink = false;
	}

	if (canHardlink) {
		// Simulate pnpm-like layout:
		// store/pkg/{package.json,index.js}           — original files
		// project-a/node_modules/pkg/{...}            — hardlinks to store
		// project-b/node_modules/pkg/{...}            — hardlinks to store
		// project-c/node_modules/pkg/{...}            — separate copies (different inode)
		const storePkg = path.join(tempPath, "store", "pkg");
		const projA = path.join(tempPath, "project-a");
		const projB = path.join(tempPath, "project-b");
		const projC = path.join(tempPath, "project-c");
		const pkgA = path.join(projA, "node_modules", "pkg");
		const pkgB = path.join(projB, "node_modules", "pkg");
		const pkgC = path.join(projC, "node_modules", "pkg");

		beforeEach(() => {
			// Create store
			fs.mkdirSync(storePkg, { recursive: true });
			fs.writeFileSync(
				path.join(storePkg, "package.json"),
				JSON.stringify({ name: "pkg", version: "1.0.0", main: "index.js" }),
			);
			fs.writeFileSync(
				path.join(storePkg, "index.js"),
				"module.exports = 'pkg';",
			);

			// Create hardlinked copies for project-a and project-b
			for (const pkgDir of [pkgA, pkgB]) {
				fs.mkdirSync(pkgDir, { recursive: true });
				fs.linkSync(
					path.join(storePkg, "package.json"),
					path.join(pkgDir, "package.json"),
				);
				fs.linkSync(
					path.join(storePkg, "index.js"),
					path.join(pkgDir, "index.js"),
				);
			}

			// Create a separate (non-hardlinked) copy for project-c
			fs.mkdirSync(pkgC, { recursive: true });
			fs.writeFileSync(
				path.join(pkgC, "package.json"),
				JSON.stringify({ name: "pkg", version: "1.0.0", main: "index.js" }),
			);
			fs.writeFileSync(
				path.join(pkgC, "index.js"),
				"module.exports = 'pkg-different';",
			);
		});

		afterEach(() => {
			fs.rmSync(tempPath, { recursive: true, force: true });
		});

		it("should confirm hardlinked files share the same inode", () => {
			const statA = fs.statSync(path.join(pkgA, "index.js"));
			const statB = fs.statSync(path.join(pkgB, "index.js"));
			expect(statA.ino).toBe(statB.ino);
			expect(statA.dev).toBe(statB.dev);
		});

		it("should resolve hardlinked files to different paths by default", (done) => {
			const { resolve } = createResolvers({
				extensions: [".js"],
				symlinks: false,
			});

			resolve(projA, "pkg", (err, resultA) => {
				if (err) return done(err);
				resolve(projB, "pkg", (err, resultB) => {
					if (err) return done(err);
					expect(resultA).toBe(path.join(pkgA, "index.js"));
					expect(resultB).toBe(path.join(pkgB, "index.js"));
					expect(resultA).not.toBe(resultB);
					done();
				});
			});
		});

		it("should resolve hardlinked files to the same path with hardlinks option", (done) => {
			const { resolve } = createResolvers({
				extensions: [".js"],
				symlinks: false,
				hardlinks: true,
			});

			resolve(projA, "pkg", (err, resultA) => {
				if (err) return done(err);
				resolve(projB, "pkg", (err, resultB) => {
					if (err) return done(err);
					expect(resultA).toBe(resultB);
					done();
				});
			});
		});

		it("should not deduplicate files with different inodes", (done) => {
			const statA = fs.statSync(path.join(pkgA, "index.js"));
			const statC = fs.statSync(path.join(pkgC, "index.js"));
			expect(statA.ino).not.toBe(statC.ino);

			const { resolve } = createResolvers({
				extensions: [".js"],
				symlinks: false,
				hardlinks: true,
			});

			resolve(projA, "pkg", (err, resultA) => {
				if (err) return done(err);
				resolve(projC, "pkg", (err, resultC) => {
					if (err) return done(err);
					expect(resultA).not.toBe(resultC);
					done();
				});
			});
		});

		it("should resolve hardlinked files to the same path (sync)", () => {
			const { resolveSync } = createResolvers({
				extensions: [".js"],
				symlinks: false,
				hardlinks: true,
			});

			const resultA = resolveSync(projA, "pkg");
			const resultB = resolveSync(projB, "pkg");

			expect(resultA).toBe(resultB);
		});

		it("should check restrictions against the canonical path", (done) => {
			// restrictions allows project-a but not project-b.
			// project-b's hardlink resolves to project-a's canonical path,
			// so it passes restrictions even though project-b is not listed.
			const { resolve } = createResolvers({
				extensions: [".js"],
				symlinks: false,
				hardlinks: true,
				restrictions: [pkgA],
			});

			resolve(projA, "pkg", (err, resultA) => {
				if (err) return done(err);
				expect(resultA).toBe(path.join(pkgA, "index.js"));

				resolve(projB, "pkg", (err, resultB) => {
					if (err) return done(err);
					// project-b's path was rewritten to project-a's canonical path,
					// which is inside the restriction — so it passes
					expect(resultB).toBe(path.join(pkgA, "index.js"));
					done();
				});
			});
		});
	} else {
		it("cannot test hardlinks on this filesystem", () => {
			expect(canHardlink).toBe(false);
		});
	}
});
