/*
 * extension-alias-many
 *
 * `extensionAlias` with multiple source extensions (`.js -> [.ts, .tsx]`,
 * `.mjs -> [.mts]`, `.cjs -> [.cts]`). Each request has to walk the alias
 * list for its trailing extension and try every candidate in order. This
 * complements `extension-alias` (a simpler single-mapping case).
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
		extensions: [".js", ".mjs", ".cjs"],
		extensionAlias: {
			".js": [".ts", ".tsx", ".js"],
			".mjs": [".mts", ".mjs"],
			".cjs": [".cts", ".cjs"],
		},
	});

	const from = path.join(fixtureDir, "src");

	// `.js` requests — the alias list tries `.ts` first (matches), then `.tsx`
	// if no `.ts`. Mix both so the fallback inside the alias list is exercised.
	const requests = [
		"./a.js", // resolves to a.ts
		"./b.js", // resolves to b.ts
		"./c.js", // resolves to c.ts
		"./d.js", // resolves to d.ts
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"extension-alias-many: 3 source exts with fallbacks (warm)",
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
