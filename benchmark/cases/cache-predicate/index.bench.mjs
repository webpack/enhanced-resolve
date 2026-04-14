/*
 * cache-predicate
 *
 * `cachePredicate` gates which results UnsafeCachePlugin stores. This
 * case fires a mix of requests where the predicate accepts some and
 * rejects others, so each bench iteration runs both the fast-path
 * (cache hit) and the slow-path (re-resolve) for the same resolver.
 *
 * Expected shape: first iteration warms the cache for "cached" paths
 * only, subsequent iterations coast for those and pay full cost for
 * "uncached" paths. The ratio of the two tells you how much cachePredicate
 * filtering costs.
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

	// Only cache things under src/cached; everything else re-resolves.
	const cachedPrefix = path.join(fixtureDir, "src/cached");
	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		unsafeCache: true,
		cachePredicate: (request) =>
			typeof request.path === "string" && request.path.startsWith(cachedPrefix),
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"./cached/a",
		"./cached/b",
		"./cached/c",
		"./cached/d",
		"./cached/e",
		"./uncached/a",
		"./uncached/b",
		"./uncached/c",
		"./uncached/d",
		"./uncached/e",
		"dep",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"cache-predicate: mixed cached/uncached requests (warm)",
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
