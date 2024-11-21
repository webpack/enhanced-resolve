const { Volume } = require("memfs");
const { ResolverFactory } = require("../");
const {
	posixSep,
	absoluteOsBasedResolvedPath,
	absoluteOsBasedPath,
	obps
} = require("./util/path-separator");

describe("fullSpecified", function () {
	const fileSystem = Volume.fromJSON(
		{
			[`${absoluteOsBasedPath}a${obps}node_modules${obps}package1${obps}index.js`]:
				"",
			[`${absoluteOsBasedPath}a${obps}node_modules${obps}package1${obps}file.js`]:
				"",
			[`${absoluteOsBasedPath}a${obps}node_modules${obps}package2${obps}package.json`]:
				JSON.stringify({
					main: "a"
				}),
			[`${absoluteOsBasedPath}a${obps}node_modules${obps}package2${obps}a.js`]:
				"",
			[`${absoluteOsBasedPath}a${obps}node_modules${obps}package3${obps}package.json`]:
				JSON.stringify({
					main: "dir"
				}),
			[`${absoluteOsBasedPath}a${obps}node_modules${obps}package3${obps}dir${obps}index.js`]:
				"",
			[`${absoluteOsBasedPath}a${obps}node_modules${obps}package4${obps}package.json`]:
				JSON.stringify({
					browser: {
						// It needs to be posixSep because it alias field inside file, this fields use only posix separator based on specification
						[`.${posixSep}a.js`]: `.${posixSep}b`
					}
				}),
			[`${absoluteOsBasedPath}a${obps}node_modules${obps}package4${obps}a.js`]:
				"",
			[`${absoluteOsBasedPath}a${obps}node_modules${obps}package4${obps}b.js`]:
				"",
			[`${absoluteOsBasedPath}a${obps}abc.js`]: "",
			[`${absoluteOsBasedPath}a${obps}dir${obps}index.js`]: "",
			[`${absoluteOsBasedPath}a${obps}index.js`]: ""
		},
		`${absoluteOsBasedPath}`
	);
	const resolver = ResolverFactory.createResolver({
		alias: {
			alias1: `${absoluteOsBasedPath}a${obps}abc`,
			alias2: `${absoluteOsBasedPath}a${obps}`
		},
		aliasFields: ["browser"],
		fullySpecified: true,
		useSyncFileSystemCalls: true,
		// @ts-ignore
		fileSystem: fileSystem
	});
	const contextResolver = ResolverFactory.createResolver({
		alias: {
			alias1: `${absoluteOsBasedPath}a${obps}abc`,
			alias2: `${absoluteOsBasedPath}a${obps}`
		},
		aliasFields: ["browser"],
		fullySpecified: true,
		resolveToContext: true,
		useSyncFileSystemCalls: true,
		// @ts-ignore
		fileSystem: fileSystem
	});

	const failingResolves = {
		"no extensions": `.${obps}abc`,
		"no extensions (absolute)": `${absoluteOsBasedResolvedPath}a${obps}abc`,
		"no extensions in packages": `package1${obps}file`,
		"no directories": ".",
		"no directories 2": `.${obps}`,
		"no directories in packages": `package3${obps}dir`,
		"no extensions in packages 2": `package3${obps}a`
	};

	const pkg = `${absoluteOsBasedResolvedPath}a${posixSep}node_modules${posixSep}package`;
	const successfulResolves = {
		"fully relative": [
			`.${obps}abc.js`,
			`${absoluteOsBasedResolvedPath}a${posixSep}abc.js`
		],
		"fully absolute": [
			`${absoluteOsBasedPath}a${obps}abc.js`,
			`${absoluteOsBasedResolvedPath}a${posixSep}abc.js`
		],
		"fully relative in package": [
			`package1${obps}file.js`,
			`${pkg}1${posixSep}file.js`
		],
		"extensions in mainFiles": ["package1", `${pkg}1${posixSep}index.js`],
		"extensions in mainFields": ["package2", `${pkg}2${posixSep}a.js`],
		"extensions in alias": [
			"alias1",
			`${absoluteOsBasedResolvedPath}a${posixSep}abc.js`
		],
		"directories in alias": [
			"alias2",
			`${absoluteOsBasedResolvedPath}a${posixSep}index.js`
		],
		"directories in packages": [
			"package3",
			`${pkg}3${posixSep}dir${posixSep}index.js`
		],
		"extensions in aliasFields": [
			`package4${obps}a.js`,
			`${pkg}4${posixSep}b.js`
		]
	};

	for (const key of Object.keys(failingResolves)) {
		const request = failingResolves[key];
		it(`should fail resolving ${key}`, () => {
			expect(() => {
				resolver.resolveSync({}, `${absoluteOsBasedPath}a`, request);
			}).toThrowError();
		});
	}

	for (const key of Object.keys(successfulResolves)) {
		const [request, expected] = successfulResolves[key];
		it(`should resolve ${key} successfully`, () => {
			try {
				expect(
					resolver.resolveSync({}, `${absoluteOsBasedPath}a`, request)
				).toEqual(expected);
			} catch (e) {
				e.message += `\n${e.details}`;
				throw e;
			}
		});
	}

	const successfulContextResolves = {
		"current folder": [".", `${absoluteOsBasedResolvedPath}a`],
		"current folder 2": [`.${posixSep}`, `${absoluteOsBasedResolvedPath}a`],
		"relative directory": [
			`.${posixSep}dir`,
			`${absoluteOsBasedResolvedPath}a${posixSep}dir`
		],
		"relative directory 2": [
			`.${posixSep}dir${posixSep}`,
			`${absoluteOsBasedResolvedPath}a${posixSep}dir`
		],
		"relative directory with query and fragment": [
			`.${posixSep}dir?123#456`,
			`${absoluteOsBasedResolvedPath}a${posixSep}dir?123#456`
		],
		"relative directory with query and fragment 2": [
			`.${posixSep}dir${posixSep}?123#456`,
			`${absoluteOsBasedResolvedPath}a${posixSep}dir?123#456`
		],
		"absolute directory": [
			`${absoluteOsBasedResolvedPath}a${posixSep}dir`,
			`${absoluteOsBasedResolvedPath}a${posixSep}dir`
		],
		"directory in package": [`package3${posixSep}dir`, `${pkg}3${posixSep}dir`]
	};

	for (const key of Object.keys(successfulContextResolves)) {
		const [request, expected] = successfulContextResolves[key];
		it(`should resolve ${key} successfully to an context`, () => {
			try {
				expect(
					contextResolver.resolveSync({}, `${absoluteOsBasedPath}a`, request)
				).toEqual(expected);
			} catch (e) {
				e.message += `\n${e.details}`;
				throw e;
			}
		});
	}
});
