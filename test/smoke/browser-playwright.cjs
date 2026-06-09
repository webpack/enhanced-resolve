"use strict";

// Bundles browser-entry.cjs for the browser with webpack and runs it in real
// headless Chromium via Playwright — the authoritative browser check. webpack
// resolves the package `browser` field and fails on any Node builtin that is
// not shimmed; Chromium then runs the bundle with genuine web APIs only and the
// resolutions are asserted via `window.__SMOKE_RESULT`.
//
// Playwright (and its Chromium) are installed by the CI job, not committed as a
// dependency. This script is intended to run there; see the browser job in
// .github/workflows/cross-runtime.yml.

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
// eslint-disable-next-line import/no-unresolved
const { chromium } = require("playwright");
const webpack = require("webpack");

const entry = path.resolve(__dirname, "browser-entry.cjs");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "er-chromium-"));
const outFile = "bundle.js";

/** @returns {Promise<string>} the bundled browser script (classic IIFE) */
function bundle() {
	return new Promise((resolve, reject) => {
		webpack(
			{
				mode: "none",
				target: "web",
				entry,
				output: { path: outDir, filename: outFile },
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
 * Bundle the entry, drive it in a headless Chromium page and surface the
 * sandbox result through this process's exit code.
 * @returns {Promise<void>} resolves on success, rejects on smoke failure
 */
async function main() {
	const code = await bundle();

	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent("<!doctype html><html><body></body></html>");
		await page.addScriptTag({ content: code });

		const result = await page.evaluate(
			// The entry assigns a promise to globalThis.__SMOKE_RESULT.
			() => globalThis.__SMOKE_RESULT,
		);

		assert(result, "bundle did not set __SMOKE_RESULT");
		for (const r of result.results) {
			assert(
				r.pass,
				`resolve(${r.request}) => ${String(r.actual)}, expected ${r.expected}`,
			);
		}
		assert(result.ok, "one or more resolutions failed in Chromium");

		console.log(
			`browser smoke: all ${result.results.length} resolutions passed in headless Chromium`,
		);
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
