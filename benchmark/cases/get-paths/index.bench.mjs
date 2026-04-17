/*
 * get-paths
 *
 * Directly benchmarks `lib/getPaths.js`, the helper that turns
 *   /a/b/c/d.js  ->  [/a/b/c/d.js, /a/b/c, /a/b, /a, /] + matching segments
 * and is called once per module resolve through
 * `ModulesInHierarchicalDirectoriesPlugin`. The previous implementation
 * built the list by `String#split` against a capture-group regex and then
 * walking the resulting parts array; this benchmark stresses that code
 * path with realistic depths (project files, workspace absolute paths,
 * deeply nested node_modules paths, and a Windows-style drive letter
 * path) so a regression on the split replacement shows up as an obvious
 * ops/s drop in the report.
 */

import getPaths from "../../../lib/getPaths.js";

/**
 * @param {import('tinybench').Bench} bench
 */
export default function register(bench) {
	const inputs = [
		"/home/user/project/src/a/b/c/d.js",
		"/home/user/project/src",
		"/home/user/project",
		"/home/user/workspace/packages/pkg-a/src/index.ts",
		"/home/user/workspace/packages/pkg-a/src/components/Button/index.tsx",
		"/home/user/workspace/node_modules/.pnpm/foo@1.0.0/node_modules/foo/dist/index.js",
		"/a/b/c",
		"/a/b/c/d/e/f/g/h/i/j",
		"/foo",
		"/",
		"C:\\projects\\app\\src\\index.ts",
		"C:\\Users\\dev\\workspace\\packages\\pkg\\dist\\index.js",
		"relative/no/absolute/path/here.js",
	];

	bench.add("get-paths: mixed absolute + Windows + bare inputs", () => {
		// Loop enough to keep the body above tinybench's measurability floor
		// under CodSpeed's single-iteration instrumentation run.
		for (let n = 0; n < 200; n++) {
			for (let i = 0; i < inputs.length; i++) {
				const { paths, segments } = getPaths(inputs[i]);
				if (paths.length === 0 || segments.length === 0) {
					throw new Error("unexpected empty result");
				}
			}
		}
	});

	bench.add("get-paths: deep 10-level POSIX path only", () => {
		const deep = "/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t.js";
		for (let n = 0; n < 1000; n++) {
			getPaths(deep);
		}
	});
}
