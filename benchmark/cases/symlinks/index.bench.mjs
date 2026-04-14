/*
 * symlinks
 *
 * Exercises SymlinkPlugin: every successful resolve hits this plugin on the
 * `existing-file` hook. With `symlinks: true` (the default) the plugin
 * follows each symlink to its real path via the fs cache, so resolving a
 * symlinked file does real I/O even after the target already exists.
 *
 * Symlinks are created on disk at registration time (not committed to
 * git) so the case is portable across platforms that support symlinks.
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
	const linkedDir = path.join(fixtureDir, "linked");

	// Create one symlink per real file. Links are relative (`../real/<x>.js`)
	// so they'd be portable if ever committed — but we intentionally build
	// them at registration time and leave them out of git via .gitignore,
	// so the fixture stays OS-agnostic on checkout.
	fs.mkdirSync(linkedDir, { recursive: true });
	const names = ["one", "two", "three", "four", "five"];
	for (const name of names) {
		const linkPath = path.join(linkedDir, `${name}.js`);
		try {
			fs.unlinkSync(linkPath);
		} catch {
			// didn't exist
		}
		// Relative target so the link resolves regardless of where the repo
		// lives on disk.
		fs.symlinkSync(`../real/${name}.js`, linkPath);
	}

	const fileSystem = new CachedInputFileSystem(fs, 4000);

	const symlinkResolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		symlinks: true,
	});

	const noSymlinkResolver = ResolverFactory.createResolver({
		fileSystem,
		extensions: [".js"],
		symlinks: false,
	});

	const requests = names.map((n) => `./linked/${n}`);

	const resolveWith = (resolver, req) =>
		new Promise((resolve, reject) => {
			resolver.resolve({}, fixtureDir, req, {}, (err, result) => {
				if (err) return reject(err);
				if (!result) return reject(new Error(`no result for ${req}`));
				resolve(result);
			});
		});

	bench.add("symlinks: follow symlinks=true (warm)", async () => {
		for (const req of requests) {
			await resolveWith(symlinkResolver, req);
		}
	});

	bench.add("symlinks: symlinks=false (warm)", async () => {
		for (const req of requests) {
			await resolveWith(noSymlinkResolver, req);
		}
	});
}
