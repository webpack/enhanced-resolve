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
 * @param {string} command binary to run, relative to `node_modules/.bin`
 * @param {string[]} args arguments
 * @returns {void}
 */
const run = (command, args) => {
	const binary = path.join(
		root,
		"node_modules",
		".bin",
		process.platform === "win32" ? `${command}.cmd` : command,
	);
	const { status } = spawnSync(binary, args, {
		cwd: root,
		stdio: "inherit",
		shell: process.platform === "win32",
	});

	if (status !== 0) {
		throw new Error(
			`${command} exited with ${status === null ? "a signal" : status}`,
		);
	}
};

rmSync(path.join(root, "types"), { recursive: true, force: true });
run("tsc", ["-p", "tsconfig.types.json"]);
run("prettier", ["--log-level", "warn", "--write", "types/**/*.d.ts"]);
