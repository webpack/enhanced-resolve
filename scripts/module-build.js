"use strict";

const assert = require("assert");
const path = require("path");
const webpack = require("webpack");

const output = path.resolve(__dirname, "../test/outputs");

/**
 * @param {(err: null | Error, stats: import("webpack").Stats) => void} done done callback
 */
function bundle(done) {
	const compiler = webpack({
		devtool: false,
		// Universal target - for node and web
		target: ["web", "node"],
		mode: "development",
		entry: path.resolve(__dirname, "../lib/index.js"),
		resolve: {
			alias: {
				"graceful-fs": false,
			},
			fallback: {
				process: require.resolve("../lib/util/process-browser.js"),
				path: require.resolve("../lib/util/path-browser.js"),
				module: require.resolve("../lib/util/module-browser.js"),
				util: path.resolve("node_modules/tapable/lib/util-browser.js"),
			},
		},
		experiments: {
			outputModule: true,
		},
		output: {
			module: true,
			path: path.join(output, "./module"),
			library: {
				type: "module",
			},
		},
	});

	compiler.run((err, stats) => {
		if (err) {
			done(err);
			return;
		}

		compiler.close((closeErr) => {
			if (closeErr) {
				done(closeErr);
				return;
			}

			done(null, stats);
		});
	});
}

bundle((err, stats) => {
	if (err) {
		throw err;
	}

	// eslint-disable-next-line no-console
	console.log(stats.toString());

	assert.ok(!stats.hasErrors());
	assert.ok(!stats.hasWarnings());
});
