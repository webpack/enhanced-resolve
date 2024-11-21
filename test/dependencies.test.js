const { Volume } = require("memfs");
const resolve = require("../");
const {
	posixSep,
	obps,
	absoluteOsBasedPath,
	absoluteOsBasedResolvedPath
} = require("./util/path-separator");

describe("dependencies", function () {
	let resolver;

	beforeEach(function () {
		const fileSystem = Volume.fromJSON(
			{
				[`${absoluteOsBasedPath}a${obps}b${obps}node_modules${obps}some-module${obps}index.js`]:
					"",
				[`${absoluteOsBasedPath}a${obps}node_modules${obps}module${obps}package.json`]:
					JSON.stringify({
						main: "entry.js"
					}),
				[`${absoluteOsBasedPath}a${obps}node_modules${obps}module${obps}file.js`]:
					JSON.stringify({ main: "entry.js" }),
				[`${absoluteOsBasedPath}modules${obps}other-module${obps}file.js`]: ""
			},
			`${absoluteOsBasedPath}`
		);
		resolver = resolve.create({
			extensions: [".json", ".js"],
			modules: [`${absoluteOsBasedPath}modules`, "node_modules"],
			// @ts-ignore
			fileSystem: fileSystem
		});
	});

	const testCases = [
		{
			name: "middle module request",
			context: `${absoluteOsBasedPath}a${obps}b${obps}c`,
			request: `module${obps}file`,
			result: `${absoluteOsBasedResolvedPath}a${posixSep}node_modules${posixSep}module${posixSep}file.js`,
			fileDependencies: [
				`${absoluteOsBasedResolvedPath}a${posixSep}node_modules${posixSep}module${posixSep}package.json`,
				`${absoluteOsBasedResolvedPath}a${posixSep}node_modules${posixSep}module${posixSep}file.js`,
				`${absoluteOsBasedResolvedPath}a${posixSep}node_modules${posixSep}module`,
				`${absoluteOsBasedResolvedPath}a${posixSep}node_modules`,
				`${absoluteOsBasedResolvedPath}a`,
				`${absoluteOsBasedResolvedPath}`
			],
			missingDependencies: [
				`${absoluteOsBasedResolvedPath}a${posixSep}b${posixSep}c${posixSep}package.json`,
				`${absoluteOsBasedResolvedPath}a${posixSep}b${posixSep}package.json`,
				`${absoluteOsBasedResolvedPath}a${posixSep}package.json`,
				`${absoluteOsBasedResolvedPath}package.json`,
				`${absoluteOsBasedResolvedPath}a${posixSep}b${posixSep}c${posixSep}node_modules`,
				`${absoluteOsBasedResolvedPath}modules${posixSep}module`,
				`${absoluteOsBasedResolvedPath}a${posixSep}b${posixSep}node_modules${posixSep}module`,
				`${absoluteOsBasedResolvedPath}a${posixSep}node_modules${posixSep}module${posixSep}file`,
				`${absoluteOsBasedResolvedPath}a${posixSep}node_modules${posixSep}module${posixSep}file.json`
			]
		},
		{
			name: "fast found module request",
			context: `${absoluteOsBasedPath}a${obps}b${obps}c`,
			request: `other-module${obps}file.js`,
			result: `${absoluteOsBasedResolvedPath}modules${posixSep}other-module${posixSep}file.js`,
			fileDependencies: [
				`${absoluteOsBasedResolvedPath}modules${posixSep}other-module${posixSep}file.js`,
				`${absoluteOsBasedResolvedPath}modules${posixSep}other-module`,
				`${absoluteOsBasedResolvedPath}modules`,
				`${absoluteOsBasedResolvedPath}`
			],
			missingDependencies: [
				`${absoluteOsBasedResolvedPath}a${posixSep}b${posixSep}c${posixSep}package.json`,
				`${absoluteOsBasedResolvedPath}a${posixSep}b${posixSep}package.json`,
				`${absoluteOsBasedResolvedPath}a${posixSep}package.json`,
				`${absoluteOsBasedResolvedPath}package.json`,
				`${absoluteOsBasedResolvedPath}modules${posixSep}other-module${posixSep}package.json`,
				`${absoluteOsBasedResolvedPath}modules${posixSep}package.json`
			]
		}
	];

	for (const testCase of testCases) {
		// eslint-disable-next-line no-loop-func
		it(`should report correct dependencies for ${testCase.name}`, done => {
			const fileDependencies = new Set();
			const missingDependencies = new Set();
			resolver(
				testCase.context,
				testCase.request,
				{
					fileDependencies,
					missingDependencies
				},
				(err, result) => {
					if (err) return done(err);

					expect(result).toEqual(testCase.result);
					expect(Array.from(fileDependencies).sort()).toEqual(
						testCase.fileDependencies.sort()
					);
					expect(Array.from(missingDependencies).sort()).toEqual(
						testCase.missingDependencies.sort()
					);
					done();
				}
			);
		});
	}
});
