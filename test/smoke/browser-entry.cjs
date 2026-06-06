"use strict";

// Browser entry used by browser-run.cjs and the browser CI job. It builds an
// in-memory *asynchronous* file system — the realistic browser model, since
// browsers have no synchronous file I/O (a real FS would be backed by fetch,
// the File System Access API or IndexedDB) — and resolves a few requests with
// the async resolver and only web globals (no Node `fs`). The outcome promise
// is exposed on
// `globalThis.__SMOKE_RESULT` for the bundle runner to await and assert on.

// Use the public entry so the bundle exercises the default-resolver path: in a
// browser the `graceful-fs` default is shimmed out (no Node `fs`), and a custom
// `fileSystem` is supplied to `create()`.
const enhancedResolve = require("../../lib/index");

/**
 * @param {Record<string, string>} fileMap absolute path -> file contents
 * @returns {object} a minimal asynchronous file system
 */
function createMemoryAsyncFs(fileMap) {
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

	/**
	 * @param {boolean} isFile is a file
	 * @returns {object} a Stats-like object
	 */
	const makeStats = (isFile) => ({
		isFile: () => isFile,
		isDirectory: () => !isFile,
		isSymbolicLink: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false,
		isFIFO: () => false,
		isSocket: () => false,
	});

	/**
	 * @param {string} p path
	 * @param {string} code error code
	 * @returns {Error} an errno error
	 */
	const fsError = (p, code) => {
		const err = /** @type {NodeJS.ErrnoException} */ (new Error(`${code}: ${p}`));
		err.code = code;
		err.path = p;
		return err;
	};

	const statImpl = (p) => {
		if (files.has(p)) return makeStats(true);
		if (dirs.has(p)) return makeStats(false);
		throw fsError(p, "ENOENT");
	};

	const readFileImpl = (p) => {
		if (!files.has(p)) throw fsError(p, "ENOENT");
		// Return Uint8Array (not a Node Buffer) to mirror a browser FS and
		// exercise the runtime-agnostic decode path in lib/util/fs.js.
		return new TextEncoder().encode(/** @type {string} */ (files.get(p)));
	};

	const readdirImpl = (p) => {
		const prefix = p === "/" ? "/" : `${p}/`;
		const names = new Set();
		for (const entry of [...files.keys(), ...dirs]) {
			if (entry.startsWith(prefix) && entry !== p) {
				const [seg] = entry.slice(prefix.length).split("/");
				if (seg) names.add(seg);
			}
		}
		return [...names];
	};

	const readlinkImpl = (p) => {
		// Nothing is a symlink in this FS.
		throw fsError(p, "EINVAL");
	};

	// Wrap a synchronous implementation as an async, callback-style fs method
	// that resolves on a microtask — like a real async browser file system.
	const toAsync =
		(impl) =>
		(arg, options, callback) => {
			const cb = typeof options === "function" ? options : callback;
			Promise.resolve().then(() => {
				let result;
				try {
					result = impl(String(arg));
				} catch (err) {
					cb(err);
					return;
				}
				cb(null, result);
			});
		};

	return {
		stat: toAsync(statImpl),
		lstat: toAsync(statImpl),
		readFile: toAsync(readFileImpl),
		readdir: toAsync(readdirImpl),
		readlink: toAsync(readlinkImpl),
		realpath: toAsync((p) => p),
	};
}

const fileSystem = createMemoryAsyncFs({
	"/app/index.js": "",
	"/app/src/a.js": "",
	"/app/src/sub/b.js": "",
	"/app/node_modules/pkg/package.json": JSON.stringify({
		name: "pkg",
		main: "lib/main.js",
		exports: { ".": "./lib/main.js", "./feature": "./lib/feature.js" },
	}),
	"/app/node_modules/pkg/lib/main.js": "",
	"/app/node_modules/pkg/lib/feature.js": "",
});

const doResolve = enhancedResolve.create({
	extensions: [".js", ".json"],
	conditionNames: ["node", "import"],
	// @ts-expect-error minimal structural file system for the browser smoke
	fileSystem,
});

/** @type {[string, string, string][]} */
const cases = [
	["/app", "./src/a.js", "/app/src/a.js"],
	["/app", "./src/a", "/app/src/a.js"],
	["/app/src/sub", "../a", "/app/src/a.js"],
	["/app", "pkg", "/app/node_modules/pkg/lib/main.js"],
	["/app", "pkg/feature", "/app/node_modules/pkg/lib/feature.js"],
];

/**
 * @param {string} context base directory
 * @param {string} request request to resolve
 * @returns {Promise<string>} the resolved path, or a THREW: message
 */
const resolveAsync = (context, request) =>
	new Promise((resolve) => {
		doResolve({}, context, request, {}, (err, result) => {
			resolve(err ? `THREW: ${err.message}` : /** @type {string} */ (result));
		});
	});

globalThis.__SMOKE_RESULT = (async () => {
	const results = [];
	let ok = true;
	for (const [context, request, expected] of cases) {
		const actual = await resolveAsync(context, request);
		const pass = actual === expected;
		if (!pass) ok = false;
		results.push({ request, expected, actual, pass });
	}
	return { ok, results };
})();
