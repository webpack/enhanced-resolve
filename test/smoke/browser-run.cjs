"use strict";

// Bundles browser-entry.cjs for the browser with webpack as an ECMAScript
// module (experiments.outputModule), then runs the ESM bundle inside a `vm`
// sandbox that exposes only browser-style globals — no `require`, `process`,
// `Buffer`, `module` or Node `fs`. For the web target webpack resolves the
// package `browser` field (the path/process/module shims) and errors on any
// Node builtin that is not shimmed, so a successful build plus a successful run
// proves the resolver works with nothing but standard web globals.
//
// Requires Node's --experimental-vm-modules flag (see the test:browser script).

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const webpack = require("webpack");

const entry = path.resolve(__dirname, "browser-entry.cjs");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "er-browser-"));
const outFile = "bundle.mjs";

/** @returns {Promise<string>} the bundled ESM source */
function bundle() {
	return new Promise((resolve, reject) => {
		webpack(
			{
				mode: "none",
				target: "web",
				entry,
				experiments: { outputModule: true },
				output: {
					path: outDir,
					filename: outFile,
					module: true,
					library: { type: "module" },
					chunkFormat: "module",
					publicPath: "",
				},
				optimization: { minimize: false },
			},
			(err, stats) => {
				if (err) return reject(err);
				if (stats && stats.hasErrors()) {
					return reject(
						new Error(stats.toString({ all: false, errors: true })),
					);
				}
				resolve(fs.readFileSync(path.join(outDir, outFile), "utf8"));
			},
		);
	});
}

/**
 * Bundle the entry, execute it in the web-globals VM sandbox and surface
 * the sandbox result through this process's exit code.
 * @returns {Promise<void>} resolves on success, rejects on smoke failure
 */
async function main() {
	const code = await bundle();

	// A deliberately minimal, browser-like global set. Notably absent: require,
	// process, Buffer, module, global, __dirname, and any Node builtin.
	const sandbox = {
		globalThis: undefined,
		console,
		URL,
		URLSearchParams,
		TextEncoder,
		TextDecoder,
		Uint8Array,
		ArrayBuffer,
		Map,
		Set,
		Promise,
		Date,
		JSON,
		Math,
		Object,
		Array,
		String,
		Number,
		Boolean,
		RegExp,
		Error,
		TypeError,
		Symbol,
		WeakMap,
		WeakSet,
		Reflect,
		Proxy,
	};
	sandbox.globalThis = sandbox;
	vm.createContext(sandbox);

	const mod = new vm.SourceTextModule(code, {
		context: sandbox,
		initializeImportMeta: (meta) => {
			meta.url = "https://example.test/bundle.mjs";
		},
	});
	await mod.link(() => {
		throw new Error("the bundle should be self-contained (no imports)");
	});
	await mod.evaluate();

	// The entry resolves asynchronously (realistic browser FS), so this is a
	// promise to await — not a plain value.
	const result = await sandbox.__SMOKE_RESULT;
	assert(result, "bundle did not set __SMOKE_RESULT");
	for (const r of result.results) {
		assert(
			r.pass,
			`resolve(${r.request}) => ${String(r.actual)}, expected ${r.expected}`,
		);
	}
	assert(result.ok, "one or more resolutions failed in the browser sandbox");

	console.log(
		`browser smoke: all ${result.results.length} resolutions passed in a Node-global-free sandbox (webpack ESM bundle)`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
