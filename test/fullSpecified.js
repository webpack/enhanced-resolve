require("should");

const { Volume } = require("memfs");
const { ResolverFactory } = require("../");

describe("fullSpecified", function () {
	const fileSystem = Volume.fromJSON(
		{
			"/a/node_modules/package1/index.js": "",
			"/a/node_modules/package1/file.js": "",
			"/a/node_modules/package2/package.json": JSON.stringify({
				main: "a"
			}),
			"/a/node_modules/package2/a.js": "",
			"/a/node_modules/package3/package.json": JSON.stringify({
				main: "dir"
			}),
			"/a/node_modules/package3/dir/index.js": "",
			"/a/node_modules/package4/package.json": JSON.stringify({
				browser: {
					"./a.js": "./b"
				}
			}),
			"/a/node_modules/package4/a.js": "",
			"/a/node_modules/package4/b.js": "",
			"/a/abc.js": "",
			"/a/dir/index.js": "",
			"/a/index.js": ""
		},
		"/"
	);
	const resolver = ResolverFactory.createResolver({
		alias: {
			alias1: "/a/abc",
			alias2: "/a/"
		},
		aliasFields: ["browser"],
		fullySpecified: true,
		useSyncFileSystemCalls: true,
		fileSystem: fileSystem
	});
	const contextResolver = ResolverFactory.createResolver({
		alias: {
			alias1: "/a/abc",
			alias2: "/a/"
		},
		aliasFields: ["browser"],
		fullySpecified: true,
		resolveToContext: true,
		useSyncFileSystemCalls: true,
		fileSystem: fileSystem
	});

	const failingResolves = {
		"no extensions": "./abc",
		"no extensions (absolute)": "/a/abc",
		"no extensions in packages": "package1/file",
		"no directories": ".",
		"no directories 2": "./",
		"no directories in packages": "package3/dir",
		"no extensions in packages 2": "package3/a"
	};

	const pkg = "/a/node_modules/package";
	const successfulResolves = {
		"fully relative": ["./abc.js", "/a/abc.js"],
		"fully absolute": ["/a/abc.js", "/a/abc.js"],
		"fully relative in package": ["package1/file.js", `${pkg}1/file.js`],
		"extensions in mainFiles": ["package1", `${pkg}1/index.js`],
		"extensions in mainFields": ["package2", `${pkg}2/a.js`],
		"extensions in alias": ["alias1", `/a/abc.js`],
		"directories in alias": ["alias2", `/a/index.js`],
		"directories in packages": ["package3", `${pkg}3/dir/index.js`],
		"extensions in aliasFields": ["package4/a.js", `${pkg}4/b.js`]
	};

	for (const key of Object.keys(failingResolves)) {
		const request = failingResolves[key];
		it(`should fail resolving ${key}`, () => {
			(() => {
				resolver.resolveSync({}, "/a", request);
			}).should.throwError();
		});
	}

	for (const key of Object.keys(successfulResolves)) {
		const [request, expected] = successfulResolves[key];
		it(`should resolve ${key} successfully`, () => {
			try {
				resolver.resolveSync({}, "/a", request).should.be.eql(expected);
			} catch (e) {
				e.message += `\n${e.details}`;
				throw e;
			}
		});
	}

	const successfulContextResolves = {
		"current folder": [".", "/a"],
		"current folder 2": ["./", "/a"],
		"relative directory": ["./dir", "/a/dir"],
		"relative directory 2": ["./dir/", "/a/dir"],
		"relative directory with query and fragment": [
			"./dir?123#456",
			"/a/dir?123#456"
		],
		"relative directory with query and fragment 2": [
			"./dir/?123#456",
			"/a/dir?123#456"
		],
		"absolute directory": ["/a/dir", "/a/dir"],
		"directory in package": ["package3/dir", `${pkg}3/dir`]
	};

	for (const key of Object.keys(successfulContextResolves)) {
		const [request, expected] = successfulContextResolves[key];
		it(`should resolve ${key} successfully to an context`, () => {
			try {
				contextResolver.resolveSync({}, "/a", request).should.be.eql(expected);
			} catch (e) {
				e.message += `\n${e.details}`;
				throw e;
			}
		});
	}
});
