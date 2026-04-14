/*
 * main-files
 *
 * Custom `mainFiles` list (beyond the default `index`) — useful for
 * projects that ship directories with `main.js`, `entry.js`, etc. The
 * UseFilePlugin tries each entry in order, so a request that matches the
 * last entry walks through every earlier one first.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		mainFiles: ["main", "entry", "index"],
	});

	const from = path.join(fixtureDir, "src");

	// Each dir provides a different entry file, so every candidate in the
	// mainFiles list gets hit across the batch.
	const requests = ["./dir-a", "./dir-b", "./dir-c"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("main-files: [main, entry, index] (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
