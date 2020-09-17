require("should");

var path = require("path");
var fs = require("fs");
var { CachedInputFileSystem, ResolverFactory } = require("../");

var fixtures = path.join(__dirname, "fixtures", "incorrect-package");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

function p() {
	return path.join.apply(
		path,
		[fixtures].concat(Array.prototype.slice.call(arguments))
	);
}

describe("incorrect description file", () => {
	const resolver = ResolverFactory.createResolver({
		useSyncFileSystemCalls: true,
		fileSystem: nodeFileSystem
	});

	it("should not resolve main in incorrect description file #1", done => {
		let called = false;
		const ctx = {
			fileDependencies: new Set(),
			log: () => {
				called = true;
			}
		};
		resolver.resolve({}, p("pack1"), ".", ctx, function (err, result) {
			if (!err) throw new Error("No error");
			err.should.be.instanceof(Error);
			ctx.fileDependencies.has(p("package.json"));
			called.should.be.eql(true);
			done();
		});
	});

	it("should not resolve main in incorrect description file #2", done => {
		let called = false;
		const ctx = {
			fileDependencies: new Set(),
			log: () => {
				called = true;
			}
		};
		resolver.resolve({}, p("pack2"), ".", ctx, function (err, result) {
			if (!err) throw new Error("No error");
			ctx.fileDependencies.has(p("package.json"));
			called.should.be.eql(true);
			done();
		});
	});

	it("should not resolve main in incorrect description file #3", done => {
		resolver.resolve({}, p("pack2"), ".", {}, function (err, result) {
			if (!err) throw new Error("No error");
			err.should.be.instanceof(Error);
			done();
		});
	});
});
