/*
 * extension-alias
 *
 * TypeScript-style workflow where authored `import "./foo.js"` specifiers
 * should resolve to `./foo.ts` on disk. Exercises ExtensionAliasPlugin,
 * which is on the hot path for every `.js` request in a TS project.
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
		extensionAlias: {
			".js": [".ts", ".js"],
		},
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"./a.js",
		"./b.js",
		"./c.js",
		"./d.js",
		"./e.js",
		"./f.js",
		"./g.js",
		"./h.js",
		"./mixed.js",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("extension-alias: .js -> .ts (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
