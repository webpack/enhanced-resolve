/*
 * realistic-midsize
 *
 * A synthetic project tree meant to approximate the distribution of resolver
 * requests in a real-world medium-sized JS project:
 *   - relative requests from deeply nested files
 *   - bare-specifier lookups into node_modules with a `main` field
 *   - bare-specifier lookups into a package with an `exports` map
 *   - scoped packages
 *   - nested node_modules (version collision between top-level and nested)
 *
 * The bench body runs one pass over a fixed request list per iteration, so
 * the reported number measures "average ops/s per full batch" — divide by
 * the batch length if you want per-resolve cost.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

// Long enough that cache entries never expire mid-run: tinybench's warmup +
// measurement loop for this task runs for a couple of seconds at most, and
// `CachedInputFileSystem`'s default 4s TTL was short enough that some stat
// calls would re-enter fs mid-benchmark and add timing jitter (~5% rme).
//
// Capped at 30s because CachedInputFileSystem's constructor allocates one
// Set per 500ms of TTL (see CacheBackend), and the cold-cache case rebuilds
// that cache every iteration — so a very large TTL would shift the
// benchmark into measuring cache construction instead of resolve work.
const WARM_FS_CACHE_TTL_MS = 30 * 1000;
const COLD_FS_CACHE_TTL_MS = 4000;

/**
 * @param {import('tinybench').Bench} bench
 * @param {{ fixtureDir: string }} ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, WARM_FS_CACHE_TTL_MS);

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js", ".json"],
		conditionNames: ["node", "require"],
		mainFields: ["main"],
	});

	// (from-directory, request) pairs. Mix of relative, bare, scoped, deep.
	const srcA = path.join(fixtureDir, "src/a");
	const srcBDeep = path.join(fixtureDir, "src/b/nested/deep");
	const root = path.join(fixtureDir, "src");

	const requests = [
		[srcA, "./a1"],
		[srcA, "./a2"],
		[srcA, "../utils"],
		[srcA, "../b"],
		[srcA, "../b/nested/deep/leaf"],
		[root, "lodash"],
		[root, "lodash/lib/map"],
		[root, "react"],
		[root, "react/jsx-runtime"],
		[root, "@scope/pkg"],
		[root, "@scope/pkg/sub"],
		[root, "debug"],
		// Nested node_modules: resolved from deep inside src/b, should hit the
		// nested copy rather than the top-level one.
		[srcBDeep, "debug"],
	];

	const resolve = (context, request) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, context, request, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${request}`));
				resolve(result);
			});
		});

	bench.add("realistic-midsize: mixed batch (warm cache)", async () => {
		for (const [from, req] of requests) {
			await resolve(from, req);
		}
	});

	// Same requests, but a fresh resolver (and fresh CachedInputFileSystem) per
	// iteration, so the fs cache never helps us. This is the metric that most
	// directly reflects the cost of the doResolve hot path itself.
	bench.add("realistic-midsize: mixed batch (cold cache)", async () => {
		const coldFs = new CachedInputFileSystem(fs, COLD_FS_CACHE_TTL_MS);
		const coldResolver = ResolverFactory.createResolver({
			fileSystem: coldFs,
			extensions: [".js", ".json"],
			conditionNames: ["node", "require"],
			mainFields: ["main"],
		});
		for (const [from, req] of requests) {
			await new Promise((resolve, reject) => {
				coldResolver.resolve({}, from, req, {}, (err) => {
					if (err) return reject(err);
					resolve();
				});
			});
		}
	});
}
