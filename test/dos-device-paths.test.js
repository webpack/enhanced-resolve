"use strict";

/* eslint-disable jsdoc/reject-any-type */

const { ResolverFactory } = require("../");

/**
 * Build a minimal in-memory filesystem whose keys are backslash-separated
 * Windows-style paths. memfs (used elsewhere in this suite) normalizes keys
 * through a posix path module, so it cannot represent a DOS device path as
 * an absolute root on a non-Windows test host — this helper can.
 *
 * Only the methods the resolver actually calls for a bare file/directory
 * resolve are implemented.
 * @param {Record<string, string>} files map from path to file content
 * @returns {any} fake filesystem
 */
function createDosFs(files) {
	const enoent = (p) => {
		const e = /** @type {NodeJS.ErrnoException} */ (
			new Error(`ENOENT: no such file or directory, '${p}'`)
		);
		e.code = "ENOENT";
		return e;
	};
	const stats = (isFile) => ({
		isFile: () => isFile,
		isDirectory: () => !isFile,
		isSymbolicLink: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false,
		isFIFO: () => false,
		isSocket: () => false,
		size: 0,
		mtimeMs: 0,
		ctimeMs: 0,
	});
	const isDir = (p) => {
		const prefix = p.endsWith("\\") || p.endsWith("/") ? p : `${p}\\`;
		for (const k of Object.keys(files)) {
			if (k !== p && k.startsWith(prefix)) return true;
		}
		return false;
	};
	const statSync = (p) => {
		if (p in files) return stats(true);
		if (isDir(p)) return stats(false);
		throw enoent(p);
	};
	const readFileSync = (p) => {
		if (!(p in files)) throw enoent(p);
		return Buffer.from(files[p]);
	};
	const readdirSync = (p) => {
		const prefix = p.endsWith("\\") || p.endsWith("/") ? p : `${p}\\`;
		/** @type {Set<string>} */
		const entries = new Set();
		for (const k of Object.keys(files)) {
			if (k.startsWith(prefix)) {
				const [seg] = k.slice(prefix.length).split(/[\\/]/);
				if (seg) entries.add(seg);
			}
		}
		return [...entries];
	};
	return {
		stat: (p, cb) => {
			try {
				cb(null, statSync(p));
			} catch (err) {
				cb(err);
			}
		},
		statSync,
		lstat: (p, cb) => {
			try {
				cb(null, statSync(p));
			} catch (err) {
				cb(err);
			}
		},
		lstatSync: statSync,
		readFile: (p, cb) => {
			try {
				cb(null, readFileSync(p));
			} catch (err) {
				cb(err);
			}
		},
		readFileSync,
		readdir: (p, cb) => {
			try {
				cb(null, readdirSync(p));
			} catch (err) {
				cb(err);
			}
		},
		readdirSync,
		// Resolver never follows symlinks here, but the interface requires these.
		readlink: (p, cb) => cb(enoent(p)),
		readlinkSync: (p) => {
			throw enoent(p);
		},
		realpath: (p, cb) => cb(null, p),
		realpathSync: (p) => p,
	};
}

describe("DOS device path resolution", () => {
	const files = {
		"\\\\?\\C:\\project\\package.json": JSON.stringify({ name: "p" }),
		"\\\\?\\C:\\project\\src\\index.js": "",
		"\\\\?\\C:\\project\\src\\utils.js": "",
		"\\\\?\\C:\\project\\src\\sub\\leaf.js": "",
		"\\\\?\\UNC\\server\\share\\pkg\\index.js": "",
		"\\\\.\\C:\\root\\device.js": "",
	};
	const fileSystem = createDosFs(files);
	const resolver = ResolverFactory.createResolver({
		useSyncFileSystemCalls: true,
		fileSystem,
		extensions: [".js"],
	});

	it("resolves a relative request against a \\\\?\\ context", () => {
		expect(resolver.resolveSync({}, "\\\\?\\C:\\project\\src", "./utils")).toBe(
			"\\\\?\\C:\\project\\src\\utils.js",
		);
	});

	it("resolves a nested relative request against a \\\\?\\ context", () => {
		expect(
			resolver.resolveSync({}, "\\\\?\\C:\\project\\src", "./sub/leaf"),
		).toBe("\\\\?\\C:\\project\\src\\sub\\leaf.js");
	});

	it("resolves '.' to the directory's index.js in a \\\\?\\ context", () => {
		expect(resolver.resolveSync({}, "\\\\?\\C:\\project\\src", ".")).toBe(
			"\\\\?\\C:\\project\\src\\index.js",
		);
	});

	it("resolves an absolute \\\\?\\ request regardless of context", () => {
		expect(
			resolver.resolveSync(
				{},
				"/any/context",
				"\\\\?\\C:\\project\\src\\utils",
			),
		).toBe("\\\\?\\C:\\project\\src\\utils.js");
	});

	it("resolves an absolute \\\\?\\UNC\\ request", () => {
		expect(
			resolver.resolveSync({}, "/any", "\\\\?\\UNC\\server\\share\\pkg\\index"),
		).toBe("\\\\?\\UNC\\server\\share\\pkg\\index.js");
	});

	it("resolves relative requests against a \\\\.\\ device-namespace context", () => {
		// The `\\.\` prefix is the Win32 device namespace. Walking up past it
		// used to infinite-recurse in `cdUp` — this exercise proves the fix.
		expect(resolver.resolveSync({}, "\\\\.\\C:\\root", "./device")).toBe(
			"\\\\.\\C:\\root\\device.js",
		);
	});

	it("preserves a query string on a \\\\?\\ request", () => {
		// The literal `?` in `\\?\` must not be parsed as a query start; the
		// real query is the one after the path.
		const resolverWithQuery = ResolverFactory.createResolver({
			useSyncFileSystemCalls: true,
			fileSystem,
			extensions: [".js"],
		});
		expect(
			resolverWithQuery.resolveSync(
				{},
				"/any",
				"\\\\?\\C:\\project\\src\\utils?foo=bar",
			),
		).toBe("\\\\?\\C:\\project\\src\\utils.js?foo=bar");
	});

	it("preserves a fragment on a \\\\?\\ request", () => {
		expect(
			resolver.resolveSync({}, "/any", "\\\\?\\C:\\project\\src\\utils#frag"),
		).toBe("\\\\?\\C:\\project\\src\\utils.js#frag");
	});

	it("rejects a missing file under a DOS device context", () => {
		expect(() =>
			resolver.resolveSync({}, "\\\\?\\C:\\project\\src", "./does-not-exist"),
		).toThrow(/Can't resolve/);
	});

	it("locates the package.json when resolving through a \\\\?\\ path", (done) => {
		const asyncResolver = ResolverFactory.createResolver({
			fileSystem,
			extensions: [".js"],
		});
		asyncResolver.resolve(
			{},
			"\\\\?\\C:\\project\\src",
			"./utils",
			{},
			(err, result, request) => {
				if (err) return done(err);
				expect(result).toBe("\\\\?\\C:\\project\\src\\utils.js");
				// The description file walk must have terminated at the
				// project root — not run past the `\\` root forever.
				expect(request).toBeDefined();
				expect(/** @type {any} */ (request).descriptionFilePath).toBe(
					"\\\\?\\C:\\project\\package.json",
				);
				done();
			},
		);
	});
});
