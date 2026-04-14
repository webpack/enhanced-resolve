/*
 * main-field
 *
 * Exercises MainFieldPlugin with multiple main field candidates
 * (`browser`, `module`, `main`) against four packages that define
 * different combinations of those fields, so every MainFieldPlugin
 * instance in the pipeline has a chance to hit or miss.
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
		mainFields: ["browser", "module", "main"],
	});

	const from = fixtureDir;

	const requests = ["pkg-main", "pkg-module", "pkg-browser", "pkg-all"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"main-field: browser/module/main combos (warm)",
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
