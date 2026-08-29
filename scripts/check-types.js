"use strict";

// Verifies that the checked-in declarations in `types/` match what `tsc`
// generates from the JSDoc in `lib/`. `npm run fix:types` regenerates them.
//
// The declarations are emitted into a temporary directory and compared file by
// file, so the check never touches the working copy.

const { spawnSync } = require("child_process");
const {
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmdirSync,
	statSync,
	unlinkSync,
} = require("fs");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const checkedIn = path.join(root, "types");
const temporary = mkdtempSync(
	path.join(os.tmpdir(), "enhanced-resolve-types-"),
);

/**
 * @param {string} dir directory to walk
 * @returns {string[]} sorted paths relative to `dir`
 */
const list = (dir) => {
	/** @type {string[]} */
	const found = [];

	/**
	 * @param {string} current directory relative to `dir`
	 * @returns {void}
	 */
	const walk = (current) => {
		for (const entry of readdirSync(path.join(dir, current))) {
			const relative = path.join(current, entry);

			if (statSync(path.join(dir, relative)).isDirectory()) {
				walk(relative);
			} else {
				found.push(relative);
			}
		}
	};

	walk("");

	return found.sort();
};

/**
 * @param {string} dir directory to remove
 * @returns {void}
 */
const remove = (dir) => {
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);

		if (statSync(full).isDirectory()) {
			remove(full);
		} else {
			unlinkSync(full);
		}
	}

	rmdirSync(dir);
};

const result = spawnSync(
	process.execPath,
	[
		path.join(root, "node_modules", "typescript", "bin", "tsc"),
		"-p",
		path.join(root, "tsconfig.types.json"),
		"--outDir",
		temporary,
	],
	{ cwd: root, stdio: "inherit" },
);

if (result.status !== 0) {
	remove(temporary);
	process.exitCode = result.status === null ? 1 : result.status;
} else {
	const expected = list(temporary);
	const actual = list(checkedIn);
	const outdated = expected.filter(
		(file) =>
			!actual.includes(file) ||
			readFileSync(path.join(temporary, file), "utf8") !==
				readFileSync(path.join(checkedIn, file), "utf8"),
	);
	const extraneous = actual.filter((file) => !expected.includes(file));

	remove(temporary);

	if (outdated.length > 0 || extraneous.length > 0) {
		for (const file of outdated) {
			console.error(`types/${file} is out of date`);
		}

		for (const file of extraneous) {
			console.error(`types/${file} is no longer generated`);
		}

		console.error("Run `npm run fix:types` to update the declarations.");
		process.exitCode = 1;
	}
}
