var path = require("path");
var Resolver = require("../lib/Resolver");
var SyncNodeJsInputFileSystem = require("../lib/SyncNodeJsInputFileSystem");
var ModulesInDirectoriesPlugin = require("../lib/ModulesInDirectoriesPlugin");
var ModuleAsFilePlugin = require("../lib/ModuleAsFilePlugin");
var ModuleAsDirectoryPlugin = require("../lib/ModuleAsDirectoryPlugin");
var DirectoryDescriptionFilePlugin = require("../lib/DirectoryDescriptionFilePlugin");
var FileAppendPlugin = require("../lib/FileAppendPlugin");

var should = require("should");

var mainModule = path.join(__dirname, "fixtures", "main-field");

function p() {
	return path.join.apply(path, [mainModule].concat(Array.prototype.slice.call(arguments)));
}

describe("mainField", function () {
	var resolver;

	beforeEach(function () {
		resolver = new Resolver(new SyncNodeJsInputFileSystem());
		resolver.apply(
			new ModulesInDirectoriesPlugin("node", ["bower_components"]),
			new ModuleAsFilePlugin("node"),
			new ModuleAsDirectoryPlugin("node"),
			new DirectoryDescriptionFilePlugin("bower.json", ["main"]),
			new FileAppendPlugin(["", ".js"])
		);
	});
	
	it("should resolve array with single element", function () {
		resolver.resolveSync(p(), "with-array").should.be.eql(p("bower_components", "with-array", "a.js"));
	});
	
	it("should resolve array with multiple values", function () {
		resolver.resolveSync(p(), "with-array-multi/a2").should.be.eql(p("bower_components", "with-array-multi", "a2.js"));
		resolver.resolveSync(p(), "with-array-multi/a2.css").should.be.eql(p("bower_components", "with-array-multi", "a2.css"));
	});
	
	it("should resolve first value in array as default module", function () {
		resolver.resolveSync(p(), "with-array-multi").should.be.eql(p("bower_components", "with-array-multi", "a2.js"));
	});
	
	it("should resolve string", function () {
		resolver.resolveSync(p(), "with-string").should.be.eql(p("bower_components", "with-string", "s.js"));
	});
});
