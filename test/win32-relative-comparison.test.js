"use strict";

const path = require("path");
const { ResolverFactory: OxcResolverFactory } = require("oxc-resolver");
const { ResolverFactory: RspackResolverFactory } = require("rspack-resolver");
const resolve = require("../");

const fixtures = path.join(__dirname, "fixtures");
const context = path.join(fixtures, "extensions");

// Posix relative paths (control group — should always pass)
const posixCases = [
	["../a.js", path.join(fixtures, "a.js")],
	["./foo", path.join(fixtures, "extensions", "foo.js")],
];

// Win32 relative paths (the issue — backslash separators)
const win32Cases = [
	["..\\a.js", path.join(fixtures, "a.js")],
	[".\\foo", path.join(fixtures, "extensions", "foo.js")],
];

describe("win32 relative paths — resolver comparison", () => {
	describe("enhanced-resolve", () => {
		for (const [request, expected] of posixCases) {
			it(`should resolve posix "${request}"`, () => {
				expect(resolve.sync(context, request)).toBe(expected);
			});
		}

		for (const [request, expected] of win32Cases) {
			it(`should resolve win32 "${request}"`, () => {
				expect(resolve.sync(context, request)).toBe(expected);
			});
		}
	});

	describe("oxc-resolver", () => {
		const resolver = new OxcResolverFactory({ extensions: [".js"] });

		for (const [request, expected] of posixCases) {
			it(`should resolve posix "${request}"`, () => {
				const result = resolver.sync(context, request);
				expect(result.path).toBe(expected);
			});
		}

		for (const [request] of win32Cases) {
			it(`cannot resolve win32 "${request}"`, () => {
				const result = resolver.sync(context, request);
				expect(result.path).toBeUndefined();
			});
		}
	});

	describe("rspack-resolver", () => {
		const resolver = new RspackResolverFactory({ extensions: [".js"] });

		for (const [request, expected] of posixCases) {
			it(`should resolve posix "${request}"`, () => {
				const result = resolver.sync(context, request);
				expect(result.path).toBe(expected);
			});
		}

		for (const [request] of win32Cases) {
			it(`cannot resolve win32 "${request}"`, () => {
				const result = resolver.sync(context, request);
				expect(result.path).toBeUndefined();
			});
		}
	});
});
