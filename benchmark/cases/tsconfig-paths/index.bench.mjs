/*
 * tsconfig-paths
 *
 * Exercises TsconfigPathsPlugin: paths mapping with multiple wildcard
 * prefixes (`@app/*`, `@components/*`, ...) and a plain-string fallback
 * (`shared`). The plugin walks the paths list and tries each prefix, so
 * a batch that hits different prefixes forces every branch.
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
		tsconfig: path.join(fixtureDir, "tsconfig.json"),
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"@app/one",
		"@app/two",
		"@app/three",
		"@components/one",
		"@components/two",
		"@components/three",
		"@utils/one",
		"@utils/two",
		"@utils/three",
		"@shared/helper",
		"shared",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("tsconfig-paths: 5 path prefixes (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
