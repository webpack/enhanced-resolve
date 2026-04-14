/*
 * many-extensions-miss
 *
 * Every request has its file stored only under the *last* candidate
 * extension. The resolver must probe (and fail) each earlier extension
 * first — 5 misses per resolve for a 6-extension list — before hitting
 * the right one. This is the worst-case shape for the AppendPlugin
 * chain and is a good regression sentinel for anything that might
 * change the cost of a failed FileExistsPlugin check.
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
		// .json is last so every resolve has to try .ts, .tsx, .mjs, .js, .jsx
		// and fail before landing on the right extension.
		extensions: [".ts", ".tsx", ".mjs", ".js", ".jsx", ".json"],
	});

	const from = path.join(fixtureDir, "src");

	const requests = ["./a", "./b", "./c", "./d", "./e", "./f"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"many-extensions-miss: 5 misses + 1 hit per resolve (warm)",
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
