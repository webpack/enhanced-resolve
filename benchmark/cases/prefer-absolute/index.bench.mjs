/*
 * prefer-absolute
 *
 * `preferAbsolute: true` makes the resolver try a server-relative (`/...`)
 * request as an absolute filesystem path before falling back to root-
 * resolution via RootsPlugin. Different code branch in the normal-resolve
 * hook than `preferRelative`, so worth a dedicated case.
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
		preferAbsolute: true,
	});

	const from = fixtureDir;

	// Absolute paths that exist on disk (under the fixture root).
	const requests = [
		path.join(fixtureDir, "assets/img/logo"),
		path.join(fixtureDir, "assets/img/hero"),
		path.join(fixtureDir, "assets/img/icon"),
		path.join(fixtureDir, "assets/data/config"),
		path.join(fixtureDir, "assets/data/schema"),
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("prefer-absolute: absolute paths (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
