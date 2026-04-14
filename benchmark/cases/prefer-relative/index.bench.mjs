/*
 * prefer-relative
 *
 * With `preferRelative: true`, a bare specifier like `local-a` is first
 * tried as `./local-a` before falling back to the module lookup. Every
 * request therefore runs an extra JoinRequestPlugin attempt, which is the
 * workload we want to measure here.
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
		preferRelative: true,
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"local-a",
		"local-b",
		"local-c",
		"some-pkg", // hits the fallback to node_modules
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("prefer-relative: bare-as-relative (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
