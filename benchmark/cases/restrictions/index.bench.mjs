/*
 * restrictions
 *
 * Exercises the RestrictionsPlugin: every resolved path is checked against
 * a list of allowed-directory regexes / string prefixes before being
 * accepted. This runs on the `resolved` hook — on the critical path for
 * every successful resolve — so even a simple config adds work per request.
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
		restrictions: [path.join(fixtureDir, "src"), /\.js$/],
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"./allowed/a",
		"./allowed/b",
		"./allowed/c",
		"./allowed/d",
		"./other/e",
		"./other/f",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("restrictions: path prefix + regex (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
