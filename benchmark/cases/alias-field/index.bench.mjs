/*
 * alias-field
 *
 * Exercises the AliasFieldPlugin (package.json `browser` field). The fixture's
 * package.json remaps several relative paths and bare specifiers, so every
 * request in the batch either:
 *   - resolves to a remapped replacement,
 *   - resolves to `false` (ignored) -> callback returns `false`,
 *   - or passes through untouched.
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
		aliasFields: ["browser"],
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"./server", // remapped to ./browser
		"./fs-shim", // remapped to ./fs-browser
		"./safe", // untouched (passes through)
		"./browser", // untouched
	];

	const resolveMaybeFalse = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				// `false` is a valid "ignored" result for the browser field.
				resolve(result);
			});
		});

	bench.add("alias-field: browser field (warm)", async () => {
		for (const req of requests) {
			await resolveMaybeFalse(req);
		}
		// And the ignored-via-false case: resolving ./node-only should return
		// `false` from the browser field, which is a distinct code path.
		await resolveMaybeFalse("./node-only");
	});
}
