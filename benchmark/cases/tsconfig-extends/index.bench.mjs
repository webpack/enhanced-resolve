/*
 * tsconfig-extends
 *
 * TsconfigPathsPlugin with a 3-level `extends` chain
 * (tsconfig.json -> tsconfig.mid.json -> tsconfig.base.json). The plugin
 * reads and merges each config lazily on first resolve; this case exists
 * to catch regressions in the extends-resolution path and to measure the
 * warm cost once the chain has been read in.
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
		"@app/index",
		"@features/alpha",
		"@features/beta",
		"@features/gamma",
		"@shared/helper",
		"@shared/logger",
		"@common/helper",
		"@common/logger",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("tsconfig-extends: 3-level extends chain (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
