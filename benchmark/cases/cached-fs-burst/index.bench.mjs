/*
 * cached-fs-burst
 *
 * Measures CachedInputFileSystem's cached-hit dispatch directly, without a
 * resolver in front. Cache hits are delivered asynchronously; hits issued
 * from one synchronous burst share a single `process.nextTick` (the first
 * hit is held in dedicated slots, later ones spill into a queue drained by
 * the same tick). The concurrent task tracks that batching, the sequential
 * task guards the single-hit slot path against regressions.
 *
 * The cache duration is Infinity so TTL decay never evicts entries
 * mid-measurement — every call after warmup is a pure cache hit.
 */

import fs from "fs";
import path from "path";
import enhanced from "../../../lib/index.js";

const { CachedInputFileSystem } = enhanced;

/**
 * @param {import("tinybench").Bench} bench bench
 * @param {{ fixtureDir: string }} ctx ctx
 */
export default function register(bench, { fixtureDir }) {
	const cachedFs = new CachedInputFileSystem(fs, Infinity);

	const files = Array.from({ length: 16 }, (_, i) =>
		path.join(fixtureDir, `file-${i}.js`),
	);

	/**
	 * @param {string} file file
	 * @returns {Promise<import("fs").Stats>} stats
	 */
	const stat = (file) =>
		new Promise((resolve, reject) => {
			cachedFs.stat(file, (err, result) =>
				err ? reject(err) : resolve(result),
			);
		});

	bench.add("cached-fs-burst: 64 concurrent cached stat calls", async () => {
		const promises = [];
		for (let round = 0; round < 4; round++) {
			for (const file of files) promises.push(stat(file));
		}
		await Promise.all(promises);
	});

	bench.add("cached-fs-burst: 64 sequential cached stat calls", async () => {
		for (let round = 0; round < 4; round++) {
			for (const file of files) await stat(file);
		}
	});
}
