"use strict";

// Runs the test suite with the Node.js built-in test runner.
//
// The files are enumerated explicitly instead of relying on `node --test`
// auto-discovery: the default discovery pattern treats every `.js` file under
// a `test/` directory as a test (including everything in `test/fixtures`), and
// native glob support in `node --test` is only available on newer Node.js
// versions. Passing an explicit list keeps behavior identical across the whole
// supported Node.js range and on every OS.

const { spawn } = require("child_process");
const { mkdirSync, readdirSync } = require("fs");
const path = require("path");

const testDir = path.join(__dirname, "..", "test");
const files = readdirSync(testDir)
	.filter((file) => file.endsWith(".test.js"))
	.sort()
	.map((file) => path.join("test", file));

const nodeArgs = process.argv.slice(2);

if (nodeArgs.includes("--experimental-test-coverage")) {
	mkdirSync(path.join(__dirname, "..", "coverage"), { recursive: true });
}

const child = spawn(process.execPath, ["--test", ...nodeArgs, ...files], {
	stdio: "inherit",
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
	} else {
		process.exitCode = code === null ? 1 : code;
	}
});
