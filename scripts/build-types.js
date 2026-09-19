"use strict";

// Generates the published type declarations in `types/` from the JSDoc in
// `lib/`, then formats them. CI regenerates and checks `git status types`, so
// a stale checkout fails the `lint` job - see `.github/workflows/test.yml`.
//
// The output directory is removed first. `tsc` overwrites the declarations it
// still emits but never deletes the ones it no longer does, and a leftover
// file is invisible to a `git status` check: it is tracked, unchanged, and
// would keep shipping after its source was gone.

const { spawnSync } = require("child_process");
const { rmSync } = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

/**
 * Runs a tool's JavaScript entry point under this Node.js, rather than its
 * `node_modules/.bin` shim. The shims are `.cmd` files on Windows, which need
 * a shell to run - and a shell gets the command line verbatim, so a checkout
 * under a path containing a space would not start.
 * @param {string} entry module path of the tool's entry point
 * @param {string[]} args arguments
 * @returns {void}
 */
const run = (entry, args) => {
	const { status } = spawnSync(
		process.execPath,
		[require.resolve(entry), ...args],
		{ cwd: root, stdio: "inherit" },
	);

	if (status !== 0) {
		throw new Error(
			`${entry} exited with ${status === null ? "a signal" : status}`,
		);
	}
};

rmSync(path.join(root, "types"), { recursive: true, force: true });
run("typescript/bin/tsc", ["-p", "tsconfig.types.json"]);
run("prettier/bin/prettier.cjs", [
	"--log-level",
	"warn",
	"--write",
	"types/**/*.d.ts",
]);
