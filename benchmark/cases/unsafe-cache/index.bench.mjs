/*
 * unsafe-cache
 *
 * Compares two resolvers:
 *   - unsafe-cache ON: every request after the first hits UnsafeCachePlugin
 *     and returns almost immediately
 *   - unsafe-cache OFF: same request list pays full cost each time
 *
 * Repeats the request list several times per bench iteration so the
 * cache-hit path is dominant in the "on" case.
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

	const cachedResolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		unsafeCache: true,
	});

	const uncachedResolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		unsafeCache: false,
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"./a/one",
		"./a/two",
		"./a/three",
		"./a/four",
		"./a/five",
		"./b/six",
		"./b/seven",
		"./b/eight",
		"dep",
	];

	const resolveWith = (resolver, req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	// Three passes per iteration so cache hits dominate the hot case.
	bench.add("unsafe-cache: ON, 3x repeat", async () => {
		for (let pass = 0; pass < 3; pass++) {
			for (const req of requests) {
				await resolveWith(cachedResolver, req);
			}
		}
	});

	bench.add("unsafe-cache: OFF, 3x repeat", async () => {
		for (let pass = 0; pass < 3; pass++) {
			for (const req of requests) {
				await resolveWith(uncachedResolver, req);
			}
		}
	});
}
