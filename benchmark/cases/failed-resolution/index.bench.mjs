/*
 * failed-resolution
 *
 * Measures the error path: requests that don't resolve to anything. This is
 * on the hot path in real projects because tooling (e.g. TypeScript, webpack
 * DllReferencePlugin, loaders) frequently probes multiple candidates and
 * expects most of them to miss before the final match.
 *
 * Every bench iteration fires a batch of failing requests; the resolver has
 * to walk every configured plugin before reporting the miss.
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
		extensions: [".js", ".json"],
	});

	const from = path.join(fixtureDir, "src");

	// None of these exist on disk. Each one must walk the full pipeline —
	// extensions tried, directory checked, node_modules walked — before
	// returning an error.
	const missingRequests = [
		"./does-not-exist",
		"./also/missing",
		"./exists-but-not-really",
		"missing-package",
		"@missing/scope",
		"./nope/nope/nope",
	];

	const resolveExpectingError = (req) =>
		new Promise((resolve) => {
			resolver.resolve({}, from, req, {}, (err) => {
				// Intentional: we're measuring the time to *fail*, not to succeed.
				resolve(err);
			});
		});

	bench.add("failed-resolution: missing files + packages", async () => {
		for (const req of missingRequests) {
			await resolveExpectingError(req);
		}
	});
}
