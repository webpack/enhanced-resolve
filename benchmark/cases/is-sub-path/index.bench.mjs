/*
 * is-sub-path
 *
 * Directly benchmarks `lib/util/path.js` `isSubPath`. This helper is called
 * by `TsconfigPathsPlugin._selectPathsDataForContext` inside a loop over
 * every known tsconfig-paths context on every resolve — so a monorepo with
 * a dozen tsconfigs pays `O(contexts)` is-sub-path checks per bare-ish
 * request.
 *
 * The previous implementation always called `normalize(parent + "/")` when
 * the parent didn't already end with a separator, constructing a brand-new
 * string and walking it through `path.posix.normalize`. The current
 * implementation tests the last char of `parent` with `charCodeAt` and
 * anchors `startsWith` at a separator directly, avoiding the normalize
 * roundtrip.
 */

import { isSubPath } from "../../../lib/util/path.js";

/**
 * @param {import('tinybench').Bench} bench
 */
export default function register(bench) {
	const parents = [
		"/home/user/project",
		"/home/user/project/src",
		"/home/user/project/src/components",
		"/home/user/workspace/packages/pkg-a",
		"/home/user/workspace/packages/pkg-b",
		"/home/user/workspace/packages/pkg-c",
		"/home/user/workspace/node_modules/.pnpm/foo@1.0.0/node_modules/foo",
		"C:\\projects\\app",
		"C:\\projects\\app\\src",
	];

	const parentsWithSep = parents.map((p) =>
		p.includes("\\") ? `${p}\\` : `${p}/`,
	);

	const requests = [
		"/home/user/project/src/components/Button/index.tsx",
		"/home/user/project/src/index.ts",
		"/home/user/workspace/packages/pkg-a/src/index.ts",
		"/home/user/workspace/packages/pkg-b/src/index.ts",
		"/home/user/workspace/node_modules/.pnpm/foo@1.0.0/node_modules/foo/dist/index.js",
		"/home/user/project-other/file.ts", // sibling that starts with parent
		"/unrelated/path/file.ts",
		"C:\\projects\\app\\src\\index.ts",
		"C:\\projects\\app-other\\file.ts",
	];

	// Representative of the TsconfigPathsPlugin workload: every request is
	// checked against every known context.
	bench.add("is-sub-path: all-pairs parent × request (no trailing sep)", () => {
		let hits = 0;
		for (let n = 0; n < 200; n++) {
			for (let i = 0; i < parents.length; i++) {
				for (let j = 0; j < requests.length; j++) {
					if (isSubPath(parents[i], requests[j])) hits++;
				}
			}
		}
		if (hits === 0) throw new Error("expected some matches");
	});

	// Same pairs but with parents pre-terminated by a separator — this is
	// the "fast path" branch, which skips normalize entirely.
	bench.add("is-sub-path: all-pairs parent (trailing sep) × request", () => {
		let hits = 0;
		for (let n = 0; n < 200; n++) {
			for (let i = 0; i < parentsWithSep.length; i++) {
				for (let j = 0; j < requests.length; j++) {
					if (isSubPath(parentsWithSep[i], requests[j])) hits++;
				}
			}
		}
		if (hits === 0) throw new Error("expected some matches");
	});
}
