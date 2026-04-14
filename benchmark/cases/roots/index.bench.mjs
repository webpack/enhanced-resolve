/*
 * roots
 *
 * Exercises RootsPlugin: requests starting with `/` are resolved against
 * one of the configured roots (common pattern in webpack loaders for
 * asset imports). The plugin has to try each root in order.
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
		roots: [fixtureDir],
	});

	const from = path.join(fixtureDir, "src");

	const requests = [
		"/assets/images/logo",
		"/assets/images/banner",
		"/assets/images/icon",
		"/assets/images/thumbnail",
		"/assets/scripts/main",
		"/assets/scripts/helper",
		"/assets/scripts/vendor",
	];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, from, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("roots: server-relative paths (warm)", async () => {
		for (const req of requests) {
			await resolve(req);
		}
	});
}
