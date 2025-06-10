"use strict";

const path = require("path");
const fs = require("fs");
const { CachedInputFileSystem, ResolverFactory } = require("../");

const fixture = path.join(__dirname, "fixtures", "scoped");

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const resolver = ResolverFactory.createResolver({
	aliasFields: ["browser"],
	fileSystem: nodeFileSystem,
});

describe("scoped-packages", () => {
	it("main field should work", (done) => {
		resolver.resolve({}, fixture, "@scope/pack1", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/@scope/pack1/main.js"),
			);
			done();
		});
	});

	it("browser field should work", (done) => {
		resolver.resolve({}, fixture, "@scope/pack2", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/@scope/pack2/main.js"),
			);
			done();
		});
	});

	it("folder request should work", (done) => {
		resolver.resolve({}, fixture, "@scope/pack2/lib", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "./node_modules/@scope/pack2/lib/index.js"),
			);
			done();
		});
	});
});
