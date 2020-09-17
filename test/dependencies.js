require("should");

var { Volume } = require("memfs");
var resolve = require("../");

describe("dependencies", function () {
	var resolver;

	beforeEach(function () {
		var fileSystem = Volume.fromJSON(
			{
				"/a/b/node_modules/some-module/index.js": "",
				"/a/node_modules/module/package.json": JSON.stringify({
					main: "entry.js"
				}),
				"/a/node_modules/module/file.js": JSON.stringify({ main: "entry.js" }),
				"/modules/other-module/file.js": ""
			},
			"/"
		);
		resolver = resolve.create({
			extensions: [".json", ".js"],
			modules: ["/modules", "node_modules"],
			fileSystem: fileSystem
		});
	});

	const testCases = [
		{
			name: "middle module request",
			context: "/a/b/c",
			request: "module/file",
			result: "/a/node_modules/module/file.js",
			fileDependencies: [
				// found package.json
				"/a/node_modules/module/package.json",
				// symlink checks
				"/a/node_modules/module/file.js",
				"/a/node_modules/module",
				"/a/node_modules",
				"/a",
				"/"
			],
			missingDependencies: [
				// missing package.jsons
				"/a/b/c/package.json",
				"/a/b/package.json",
				"/a/package.json",
				"/package.json",
				// missing modules directories
				"/a/b/c/node_modules",
				// missing single file modules
				"/modules/module",
				"/a/b/node_modules/module",
				// missing files with alterative extensions
				"/a/node_modules/module/file",
				"/a/node_modules/module/file.json"
			]
		},
		{
			name: "fast found module request",
			context: "/a/b/c",
			request: "other-module/file.js",
			result: "/modules/other-module/file.js",
			fileDependencies: [
				// symlink checks
				"/modules/other-module/file.js",
				"/modules/other-module",
				"/modules",
				"/"
			],
			missingDependencies: [
				// missing package.jsons
				"/a/b/c/package.json",
				"/a/b/package.json",
				"/a/package.json",
				"/package.json",
				"/modules/other-module/package.json",
				"/modules/package.json"
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

					result.should.be.eql(testCase.result);
					Array.from(fileDependencies)
						.sort()
						.should.eql(testCase.fileDependencies.sort());
					Array.from(missingDependencies)
						.sort()
						.should.eql(testCase.missingDependencies.sort());
					done();
				}
			);
		});
	}
});
