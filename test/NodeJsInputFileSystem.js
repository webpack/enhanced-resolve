var nodeJsInputFileSystem = require("../lib/NodeJsInputFileSystem");
var should = require("should");

describe("NodeJsInputFileSystem", function() {
	this.timeout(3000);
	it("shoud not require fs argument in constructor", function(done) {
		var nodeFs = new nodeJsInputFileSystem();
		should.exist(nodeFs);
		done();
	});

	it("shoud allow fs argument in constructor", function(done) {
		const volumeDir = "app";
		//const unionfs = require("unionfs");
		const memfs = require("memfs");
		// mount files specified by "mockedFiles.js.amd" to "app" base directory.
		const json = {
			"./README.md": "1"
		};
		var vol = memfs.Volume.fromJSON(json, `${volumeDir}`);
		//var ufs = unionfs.ufs.use(vol);
		var nodeFs = new nodeJsInputFileSystem(vol);
		should.exist(nodeFs);
		done();
	});

	it("should call methods on fs provided", function(done) {
		const volumeDir = "app";
		//const unionfs = require("unionfs");
		const memfs = require("memfs");
		// mount files specified by "mockedFiles.js.amd" to "app" base directory.
		const json = {
			"./README.md": "1"
		};
		var vol = memfs.Volume.fromJSON(json, `${volumeDir}`);
		var nodeFs = new nodeJsInputFileSystem(vol);

		// stat
		// statSync
		nodeFs.stat("app/README.md", (err, stats) => {
			should.exist(stats);
			should.not.exist(err);
			var statsSync = nodeFs.statSync("app/README.md");
			should.exist(statsSync);
			done();
		});
	});

	it("should call methods on default fs when no fs provided", function(done) {
		var nodeFs = new nodeJsInputFileSystem();

		// stat
		// statSync
		nodeFs.stat("README.md", (err, stats) => {
			should.exist(stats);
			should.not.exist(err);
			var statsSync = nodeFs.statSync("README.md");
			should.exist(statsSync);
			done();
		});
	});
});
