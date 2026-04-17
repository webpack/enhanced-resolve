/*
 * cd-up
 *
 * Directly benchmarks `DescriptionFileUtils.cdUp`, which walks a directory
 * path one level up. It's called in a loop by `loadDescriptionFile` when
 * searching for the nearest `package.json` on the ancestor chain, so a
 * single resolve can trigger it dozens of times. The old implementation
 * did two full `String#lastIndexOf` scans per call; this bench contrasts
 * single-level calls, long directory chains walked to the root, and
 * Windows-style paths.
 */

import { cdUp } from "../../../lib/DescriptionFileUtils.js";

/**
 * @param {import('tinybench').Bench} bench
 */
export default function register(bench) {
	const posixDirs = [
		"/",
		"/home",
		"/home/user",
		"/home/user/project",
		"/home/user/project/src",
		"/home/user/project/src/components",
		"/home/user/project/src/components/Button",
		"/home/user/workspace/packages/pkg-a/src/index",
		"/home/user/workspace/node_modules/.pnpm/foo@1.0.0/node_modules/foo/dist",
	];

	const winDirs = [
		"C:\\projects\\app\\src\\components\\Button",
		"C:\\projects\\app\\src\\components",
		"C:\\projects\\app\\src",
		"C:\\projects\\app",
		"C:\\projects",
		"C:\\",
	];

	bench.add("cd-up: mixed POSIX + Windows single-level calls", () => {
		for (let n = 0; n < 2000; n++) {
			for (let i = 0; i < posixDirs.length; i++) cdUp(posixDirs[i]);
			for (let i = 0; i < winDirs.length; i++) cdUp(winDirs[i]);
		}
	});

	bench.add("cd-up: walk to root, 10-level POSIX chain", () => {
		for (let n = 0; n < 1000; n++) {
			/** @type {string | null} */
			let cur = "/a/b/c/d/e/f/g/h/i/j";
			while (cur) cur = cdUp(cur);
		}
	});
}
