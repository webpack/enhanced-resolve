/*
 * unsafe-cache-key-build
 *
 * Exercises the cache-id construction in `UnsafeCachePlugin` specifically.
 * Distinct from `unsafe-cache`, which measures the hot hit path on a small
 * request list: this one sweeps a wider set of requests so
 * `getCacheId()` gets called with varied (path, request, query, fragment)
 * tuples. The previous implementation serialized a temporary object via
 * `JSON.stringify`; the new one concatenates components directly with
 * NUL separators. A regression on either path shows up here.
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
		unsafeCache: true,
	});

	const from = path.join(fixtureDir, "src");

	// 40 distinct requests so the cache-id hash table is populated and every
	// pass re-issues the same IDs (exercising the build-then-lookup path).
	const subDirs = ["a", "b", "c", "d"];
	const names = [
		"one",
		"two",
		"three",
		"four",
		"five",
		"six",
		"seven",
		"eight",
		"nine",
		"ten",
	];
	const requests = [];
	for (const d of subDirs) {
		for (const n of names) {
			requests.push(`./${d}/${n}`);
		}
	}
	// Add some query/fragment variants so that branch of getCacheId is
	// covered too.
	for (const d of subDirs) {
		requests.push(`./${d}/one?v=1`);
		requests.push(`./${d}/two#section`);
	}

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"unsafe-cache-key-build: 48 distinct requests, 3x pass, cached",
		async () => {
			for (let pass = 0; pass < 3; pass++) {
				for (const req of requests) {
					await resolve(req);
				}
			}
		},
	);
}
