"use strict";

const resolve = require("../");

// Build a minimal in-memory filesystem that mimics a case-insensitive
// filesystem (macOS APFS / NTFS): stat succeeds for any case-variant
// of an on-disk filename, while readdir returns the actual on-disk
// casing. This is what watchpack#228 trips over: enhanced-resolve used
// to propagate the requested casing into fileDependencies and the
// resolved path, so the watcher's time-info map (keyed by the on-disk
// casing) and webpack's lookup (keyed by the requested casing) ended up
// disagreeing.
const createCaseInsensitiveFs = (files) => {
	// Map from lowercase absolute path -> actual stored absolute path
	const lookup = new Map();
	// Map from lowercase parent dir -> array of actual entry names
	const dirs = new Map();

	const isDirectoryPath = (p) => dirs.has(p.toLowerCase());

	for (const filePath of Object.keys(files)) {
		lookup.set(filePath.toLowerCase(), filePath);
		const lastSlash = filePath.lastIndexOf("/");
		const dir = filePath.slice(0, lastSlash) || "/";
		const name = filePath.slice(lastSlash + 1);
		const dirKey = dir.toLowerCase();
		if (!dirs.has(dirKey)) dirs.set(dirKey, []);
		dirs.get(dirKey).push(name);
		// Ensure parent dirs are registered too
		let cur = dir;
		while (cur && cur !== "/") {
			const parentSlash = cur.lastIndexOf("/");
			const parent = cur.slice(0, parentSlash) || "/";
			const parentKey = parent.toLowerCase();
			const childName = cur.slice(parentSlash + 1);
			if (!dirs.has(parentKey)) dirs.set(parentKey, []);
			if (!dirs.get(parentKey).includes(childName)) {
				dirs.get(parentKey).push(childName);
			}
			cur = parent;
		}
	}

	const stat = (p, callback) => {
		const lower = p.toLowerCase();
		if (lookup.has(lower)) {
			return callback(null, {
				isFile: () => true,
				isDirectory: () => false,
				isSymbolicLink: () => false,
			});
		}
		if (isDirectoryPath(p)) {
			return callback(null, {
				isFile: () => false,
				isDirectory: () => true,
				isSymbolicLink: () => false,
			});
		}
		const err = new Error(`ENOENT: no such file or directory, stat '${p}'`);
		err.code = "ENOENT";
		callback(err);
	};

	const readdir = (p, callback) => {
		const entries = dirs.get(p.toLowerCase());
		if (entries) return callback(null, [...entries]);
		const err = new Error(`ENOENT: no such file or directory, scandir '${p}'`);
		err.code = "ENOENT";
		callback(err);
	};

	const readFile = (p, callback) => {
		const actual = lookup.get(p.toLowerCase());
		if (actual !== undefined) return callback(null, files[actual]);
		const err = new Error(`ENOENT: no such file or directory, open '${p}'`);
		err.code = "ENOENT";
		callback(err);
	};

	const noop = (p, callback) => {
		const err = new Error("ENOENT");
		err.code = "ENOENT";
		callback(err);
	};

	return {
		stat,
		readdir,
		readFile,
		readlink: noop,
		readJson: undefined,
		realpath: undefined,
		lstat: stat,
	};
};

describe("case-insensitive filesystem", () => {
	it("normalizes resolved file path to on-disk casing (watchpack#228)", (done) => {
		const fileSystem = createCaseInsensitiveFs({
			"/project/src/Hello.tsx": "",
		});
		const resolver = resolve.create({
			extensions: [".tsx", ".ts", ".js"],
			// @ts-expect-error custom test fs
			fileSystem,
			// Avoid description-file lookups taking us outside the fixture.
			descriptionFiles: [],
		});
		resolver("/project/src", "./hello", (err, result) => {
			if (err) return done(err);
			expect(result).toBe("/project/src/Hello.tsx");
			done();
		});
	});

	it("records on-disk casing in fileDependencies", (done) => {
		const fileSystem = createCaseInsensitiveFs({
			"/project/src/Hello.tsx": "",
		});
		const resolver = resolve.create({
			extensions: [".tsx"],
			// @ts-expect-error custom test fs
			fileSystem,
			descriptionFiles: [],
			// Symlink resolution would attempt readlink and is not relevant here.
			symlinks: false,
		});
		const fileDependencies = new Set();
		resolver(
			"/project/src",
			"./HELLO",
			{ fileDependencies, missingDependencies: new Set() },
			(err, result) => {
				if (err) return done(err);
				expect(result).toBe("/project/src/Hello.tsx");
				expect(fileDependencies.has("/project/src/Hello.tsx")).toBe(true);
				expect(fileDependencies.has("/project/src/HELLO.tsx")).toBe(false);
				done();
			},
		);
	});

	it("leaves the path untouched when the casing already matches", (done) => {
		const fileSystem = createCaseInsensitiveFs({
			"/project/src/Hello.tsx": "",
		});
		const resolver = resolve.create({
			extensions: [".tsx"],
			// @ts-expect-error custom test fs
			fileSystem,
			descriptionFiles: [],
			symlinks: false,
		});
		resolver("/project/src", "./Hello", (err, result) => {
			if (err) return done(err);
			expect(result).toBe("/project/src/Hello.tsx");
			done();
		});
	});
});
