/*
 * concurrent-batch
 *
 * Measures in-flight parallelism: a batch of 15 resolves fired through
 * Promise.all rather than sequentially. Real build tools (webpack,
 * bundlers, test runners) dispatch many concurrent resolves per module
 * graph pass, and enhanced-resolve has in-flight request de-duplication
 * (`_activeAsyncOperations` in CachedInputFileSystem) that should make
 * concurrent calls cheap. This case is the one that would catch any
 * regression in that concurrent-request handling.
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
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"./a",
		"./b",
		"./c",
		"./d",
		"./e",
		"./f",
		"./g",
		"./h",
		"./i",
		"./j",
		"./k",
		"./l",
		"dep-a",
		"dep-b",
		"dep-c",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("concurrent-batch: Promise.all of 15 resolves (warm)", async () => {
		await Promise.all(requests.map((r) => resolve(r)));
	});
}
