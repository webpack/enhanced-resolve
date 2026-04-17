/*
 * modules-flat-addrs
 *
 * Exercises `ModulesUtils.modulesResolveHandler` with an 8-deep source
 * directory × 4-entry `modules` list. The plugin fans out every ancestor
 * directory × every configured modules dir into one flat `addrs` array
 * and stats each. Previously that flat list was produced by `map` then
 * `reduce(...)`; the current implementation pre-sizes the array and
 * fills it in-place. This bench sets N_ancestors = 9 × N_modules = 4 =
 * 36 addrs per request and runs five bare-specifier resolves per
 * iteration so the fan-out step dominates.
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
		modules: ["shared-libs", "packages", "vendor", "node_modules"],
	});

	const deep = path.join(fixtureDir, "src/a/b/c/d/e/f/g/h");

	const requests = ["shared-dep", "vendor-dep", "pkg-dep", "lib-dep"];

	const resolve = (req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, deep, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add(
		"modules-flat-addrs: 8-deep dir × 4 modules, 4 bare resolves",
		async () => {
			for (const req of requests) {
				await resolve(req);
			}
		},
	);
}
