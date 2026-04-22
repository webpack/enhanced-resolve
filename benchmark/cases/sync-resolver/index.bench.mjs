/*
 * sync-resolver
 *
 * Measures the resolve path on a sync-capable filesystem. The underlying
 * resolver is now fully promise-based, so this case uses `resolvePromise`;
 * the `useSyncFileSystemCalls: true` flag still shortcuts fs I/O to sync
 * calls, which is what webpack's loader resolver configures.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { ResolverFactory, CachedInputFileSystem } = enhanced;

/**
 * @param {import("tinybench").Bench} bench bench
 * @param {{ fixtureDir: string }} ctx ctx
 */
export default function register(bench, { fixtureDir }) {
	const fileSystem = new CachedInputFileSystem(fs, 4000);

	const resolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		useSyncFileSystemCalls: true,
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"./a/one",
		"./a/two",
		"./a/three",
		"./b/four",
		"./b/five",
		"lodash",
	];

	bench.add("sync-resolver: resolvePromise mixed batch (warm)", async () => {
		for (const req of requests) {
			const result = await resolver.resolvePromise({}, from, req);
			if (!result) throw new Error(`no result for ${req}`);
		}
	});
}
