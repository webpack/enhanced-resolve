/*
 * get-inner-request
 *
 * Directly benchmarks `lib/getInnerRequest.js`. It is called from most
 * resolve-step plugins that need the "effective" request for a package
 * (AliasFieldPlugin, RestrictionsPlugin, ExportsFieldPlugin, ...), so it
 * fires multiple times per resolve. The cheap path is "request has no
 * relative prefix" — we used to pay a regex-dispatch for that check; this
 * bench exercises that plus a mix of relative/absolute shapes.
 */

import getInnerRequest from "../../../lib/getInnerRequest.js";

/**
 * Minimal resolver stand-in: the function only calls `resolver.join` on the
 * relative-prefix path, so any two-arg joiner is fine for benchmark purposes.
 */
const fakeResolver = {
	join(a, b) {
		return `${a}/${b}`;
	},
};

/**
 * @param {import('tinybench').Bench} bench
 */
export default function register(bench) {
	// A mix of request shapes: the cheap no-relative-prefix path dominates in
	// real workloads, so it's weighted here too.
	const requests = [
		{ request: "lodash", relativePath: "./" },
		{ request: "react/jsx-runtime", relativePath: "./" },
		{ request: "@scope/pkg/subpath", relativePath: "./src" },
		{ request: "./Button", relativePath: "./src/components" },
		{ request: "../utils/format", relativePath: "./src/components/Button" },
		{ request: "../../shared", relativePath: "./src/components/Button" },
		{ request: ".", relativePath: "./src" },
		{ request: "..", relativePath: "./src/components" },
		{ request: "./a", relativePath: "./pkg" },
		{ request: "some-dep/deep/path", relativePath: "./" },
		{ request: "#internal", relativePath: "./lib" },
		{ request: "@my/pkg", relativePath: "./" },
	];

	bench.add("get-inner-request: mixed request shapes (cold each time)", () => {
		for (let n = 0; n < 500; n++) {
			for (let i = 0; i < requests.length; i++) {
				// Fresh shallow copies each iteration so the __innerRequest memo
				// cache miss path is what we measure (the regex replacement is
				// what matters for the cold case).
				const shape = requests[i];
				const req = {
					request: shape.request,
					relativePath: shape.relativePath,
				};
				getInnerRequest(fakeResolver, req);
			}
		}
	});

	bench.add("get-inner-request: memoized hot repeats on same object", () => {
		// Reuse the same request object across calls so the memo fast path
		// returns immediately. This path used to test three fields before
		// returning the cached result; keep it measurable.
		const req = {
			request: "./deeply/nested/module",
			relativePath: "./src/a/b",
		};
		// Prime the memo
		getInnerRequest(fakeResolver, req);
		for (let n = 0; n < 20000; n++) {
			getInnerRequest(fakeResolver, req);
		}
	});
}
