/*
 * enforce-extension
 *
 * `enforceExtension: true` drops the "no extension" TryNextPlugin path —
 * the resolver *only* succeeds if one of the configured extensions has
 * been appended. Worth tracking separately from `fully-specified`
 * (which additionally skips directory fallback).
 *
 * The bare specifiers below are expected to be extended by the resolver
 * to `./a.js`, `./b.js`, ... via AppendPlugin. Handing in requests that
 * already include the extension would instead produce `./a.js.js` (the
 * AppendPlugin is unconditional) and fail.
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
		enforceExtension: true,
	});

	const from = path.join(fixtureDir, "src");

	const requests = ["./a", "./b", "./c", "./d", "./e", "./f"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("enforce-extension: explicit .js requests (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
