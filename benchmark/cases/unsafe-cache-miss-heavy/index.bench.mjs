/*
 * unsafe-cache-miss-heavy
 *
 * Stresses the `UnsafeCachePlugin` cache-key hot path: every request in the
 * batch has a unique (from, request) pair so the plugin must compute a
 * cache id for each one, and the first pass is a pure miss (so we measure
 * "build the key and insert" rather than "build the key and lookup").
 *
 * We run two passes per bench iteration:
 *   - pass 1: every request is a cache miss   → worst case for `getCacheId`
 *   - pass 2: every request is a cache hit     → measures the hot lookup
 *     path where the cache-id computation is the only non-trivial work
 *
 * Different from `unsafe-cache`, which only has 9 distinct requests and is
 * dominated by the "no work, just return the cached entry" path — here we
 * deliberately produce a cache with enough entries that `getCacheId` is the
 * observable cost.
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
	const fileSystem = new CachedInputFileSystem(fs, 30 * 1000);

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		unsafeCache: true,
	});

	// A mix of:
	//   - relative paths from a shallow directory
	//   - relative paths from a deeply nested directory (different from-path
	//     means the requesting file's descriptionFilePath differs, but the
	//     normalization in UnsafeCachePlugin collapses them)
	//   - bare specifiers (different cache-key shape)
	//   - query/fragment suffixed requests (exercise the query/fragment
	//     fields in the cache id)
	const shallowFrom = path.join(fixtureDir, "src", "a");
	const deepFrom = path.join(fixtureDir, "src", "b", "c", "d", "e", "f");

	const requests = [];
	for (let i = 1; i <= 10; i++) {
		requests.push([shallowFrom, `./s${i}`]);
		requests.push([deepFrom, `./deep${i}`]);
		requests.push([shallowFrom, `./s${i}?v=1#top`]);
		requests.push([deepFrom, `./deep${i}?v=1#top`]);
	}
	requests.push([shallowFrom, "dep"]);
	requests.push([deepFrom, "dep"]);

	const resolve = (from, req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("unsafe-cache-miss-heavy: 1 miss pass + 1 hit pass", async () => {
		for (const [from, req] of requests) {
			await resolve(from, req);
		}
		for (const [from, req] of requests) {
			await resolve(from, req);
		}
	});
}
