/*
 * array-alias
 *
 * An alias whose value is an array of candidates
 * (`{ name: "@", alias: [preferred, fallback] }`). AliasPlugin tries each
 * entry in order; the resolver must recurse into the first match, or walk
 * to the next if it fails. Good for catching regressions in the
 * multi-target alias handling that's harder to exercise with a single
 * string alias.
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
		alias: [
			{
				name: "@",
				// First entry always matches these requests; the second is the
				// fallback that would be walked if the first missed.
				alias: [
					path.join(fixtureDir, "src/preferred"),
					path.join(fixtureDir, "src/fallback"),
				],
			},
		],
	});

	const from = path.join(fixtureDir, "src");

	const requests = ["@/a", "@/b", "@/c"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("array-alias: @ -> [preferred, fallback] (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
