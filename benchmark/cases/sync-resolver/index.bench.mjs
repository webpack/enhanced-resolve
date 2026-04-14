/*
 * sync-resolver
 *
 * Measures the `useSyncFileSystemCalls: true` path via `resolveSync`, which
 * webpack's loader resolver uses. This path bypasses the async plumbing in
 * the resolver and is a distinct hot code path worth tracking separately
 * from the async case.
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

	bench.add("sync-resolver: resolveSync mixed batch (warm)", () => {
		for (const req of requests) {
			const result = resolver.resolveSync({}, from, req);
			if (!result) throw new Error(`no result for ${req}`);
		}
	});
}
