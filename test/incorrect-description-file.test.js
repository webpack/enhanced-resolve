const path = require("path");
const fs = require("fs");
const { CachedInputFileSystem, ResolverFactory } = require("../");
const { transferPathToPosix } = require("./util/path-separator");

const fixtures = path.join(__dirname, "fixtures", "incorrect-package");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

// We need this function to pass win32 paths to library code
function pForLibrary() {
	return path.join.apply(
		path,
		[fixtures].concat(Array.prototype.slice.call(arguments))
	);
}

function p() {
	return transferPathToPosix(
		path.join.apply(
			path,
			[fixtures].concat(Array.prototype.slice.call(arguments))
		)
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
		resolver.resolve(
			{},
			pForLibrary("pack1"),
			".",
			ctx,
			function (err, result) {
				if (!err) return done(new Error("No error"));
				expect(err).toBeInstanceOf(Error);
				expect(ctx.fileDependencies.has(p("pack1", "package.json"))).toEqual(
					true
				);
				expect(called).toBe(true);
				done();
			}
		);
	});

	it("should not resolve main in incorrect description file #2", done => {
		let called = false;
		const ctx = {
			fileDependencies: new Set(),
			log: () => {
				called = true;
			}
		};
		resolver.resolve(
			{},
			pForLibrary("pack2"),
			".",
			ctx,
			function (err, result) {
				if (!err) return done(new Error("No error"));
				expect(ctx.fileDependencies.has(p("pack2", "package.json"))).toEqual(
					true
				);
				expect(called).toBe(true);
				done();
			}
		);
	});

	it("should not resolve main in incorrect description file #3", done => {
		resolver.resolve({}, pForLibrary("pack2"), ".", {}, function (err, result) {
			if (!err) return done(new Error("No error"));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});
});
