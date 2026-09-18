"use strict";

// Generates the published type declarations from the JSDoc in `lib/`.
//
// This used to be done by `webpack/tooling`, which bundled every reachable
// type into a single hand-rolled `types.d.ts`. TypeScript can emit the same
// information itself, so the declarations are now whatever `tsc` derives from
// the sources - there is no second type system to keep in sync, and a type
// that is wrong in the emitted output is wrong in the JSDoc it came from.
//
//   node scripts/generate-types.js            write `types/`
//   node scripts/generate-types.js --check    fail if `types/` is stale
//
// The check mode emits into a temporary directory and compares, so CI reports
// a stale checkout without leaving a dirty working tree behind.

const { spawnSync } = require("child_process");
const {
	existsSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
} = require("fs");
const { tmpdir } = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "types");

/**
 * @param {string} dir directory to emit the declarations into
 * @returns {void}
 */
const emit = (dir) => {
	const tsc = path.join(
		root,
		"node_modules",
		".bin",
		process.platform === "win32" ? "tsc.cmd" : "tsc",
	);
	const { status } = spawnSync(
		tsc,
		["-p", "tsconfig.types.json", "--declarationDir", dir],
		{ cwd: root, stdio: "inherit", shell: process.platform === "win32" },
	);

	if (status !== 0) {
		throw new Error(`tsc exited with ${status === null ? "a signal" : status}`);
	}
};

/**
 * @param {string} dir directory to walk
 * @param {string=} prefix path of `dir` relative to the walk root
 * @returns {Map<string, string>} declaration path relative to `dir`, to content
 */
const readDeclarations = (dir, prefix = "") => {
	/** @type {Map<string, string>} */
	const declarations = new Map();

	for (const entry of readdirSync(dir).sort()) {
		const absolute = path.join(dir, entry);
		const relative = prefix ? `${prefix}/${entry}` : entry;

		if (statSync(absolute).isDirectory()) {
			for (const [file, content] of readDeclarations(absolute, relative)) {
				declarations.set(file, content);
			}
		} else if (entry.endsWith(".d.ts")) {
			declarations.set(relative, readFileSync(absolute, "utf8"));
		}
	}

	return declarations;
};

/**
 * @returns {void}
 */
const write = () => {
	rmSync(outDir, { recursive: true, force: true });
	emit(outDir);
};

/**
 * @returns {void}
 */
const check = () => {
	const temporary = mkdtempSync(path.join(tmpdir(), "enhanced-resolve-types-"));

	try {
		emit(temporary);

		const expected = readDeclarations(temporary);
		const actual = existsSync(outDir) ? readDeclarations(outDir) : new Map();
		/** @type {string[]} */
		const stale = [];

		for (const [file, content] of expected) {
			if (actual.get(file) !== content) stale.push(`types/${file}`);
		}

		for (const file of actual.keys()) {
			if (!expected.has(file)) {
				stale.push(`types/${file} (no longer generated)`);
			}
		}

		if (stale.length > 0) {
			throw new Error(
				`The following generated files need to be updated:\n${stale
					.map((file) => `  ${file}`)
					.join("\n")}\nRun \`npm run fix:special\` to update them.`,
			);
		}
	} finally {
		rmSync(temporary, { recursive: true, force: true });
	}
};

if (process.argv.includes("--check")) {
	check();
} else {
	write();
}
