/*
 * fallback
 *
 * Exercises the `fallback` aliases (webpack's `resolve.fallback`). Fallback
 * entries only kick in after normal resolution has failed for a bare
 * specifier, so this case measures the "module-not-found -> fallback"
 * detour. Common pattern for providing Node built-in shims in browser builds.
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
		fallback: [
			{ name: "crypto", alias: path.join(fixtureDir, "src/shims/crypto.js") },
			{ name: "buffer", alias: path.join(fixtureDir, "src/shims/buffer.js") },
			{ name: "stream", alias: path.join(fixtureDir, "src/shims/stream.js") },
			{ name: "util", alias: path.join(fixtureDir, "src/shims/util.js") },
		],
	});

	const from = path.join(fixtureDir, "src");

	const requests = ["crypto", "buffer", "stream", "util"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("fallback: node-builtin polyfill aliases (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
