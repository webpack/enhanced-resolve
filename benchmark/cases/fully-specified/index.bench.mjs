/*
 * fully-specified
 *
 * ESM-style resolution where every specifier must include the file extension
 * and directory fallbacks are disabled. Exercises the `fullySpecified: true`
 * code path which short-circuits several plugins (AppendPlugin / TryNext
 * combos and the "as directory" conditional) — so the hot path here is
 * tighter than the normal-resolve case.
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
		extensions: [".mjs"],
		fullySpecified: true,
		conditionNames: ["node", "import"],
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"./a.mjs",
		"./b.mjs",
		"./c.mjs",
		"./d.mjs",
		"./e.mjs",
		"./f.mjs",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("fully-specified: ESM-style imports (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
