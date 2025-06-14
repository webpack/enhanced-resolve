"use strict";

const path = require("path");
const fs = require("fs");
const ResolverFactory = require("../lib/ResolverFactory");
const CachedInputFileSystem = require("../lib/CachedInputFileSystem");

const fixture = path.resolve(__dirname, "fixtures", "restrictions");
const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

describe("restrictions", () => {
	it("should respect RegExp restriction", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: [/\.(sass|scss|css)$/],
		});

		resolver.resolve({}, fixture, "pck1", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should try to find alternative #1", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js", ".css"],
			fileSystem: nodeFileSystem,
			mainFiles: ["index"],
			restrictions: [/\.(sass|scss|css)$/],
		});

		resolver.resolve({}, fixture, "pck1", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "node_modules/pck1/index.css"),
			);
			done();
		});
	});

	it("should respect string restriction", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			restrictions: [fixture],
		});

		resolver.resolve({}, fixture, "pck2", {}, (err, result) => {
			if (!err) return done(new Error(`expect error, got ${result}`));
			expect(err).toBeInstanceOf(Error);
			done();
		});
	});

	it("should try to find alternative #2", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFields: ["main", "style"],
			restrictions: [fixture, /\.(sass|scss|css)$/],
		});

		resolver.resolve({}, fixture, "pck2", {}, (err, result) => {
			if (err) return done(err);
			if (!result) return done(new Error("No result"));
			expect(result).toEqual(
				path.resolve(fixture, "node_modules/pck2/index.css"),
			);
			done();
		});
	});

	it("should try to find alternative #3", (done) => {
		const resolver = ResolverFactory.createResolver({
			extensions: [".js"],
			fileSystem: nodeFileSystem,
			mainFields: ["main", "module", "style"],
			restrictions: [fixture, /\.(sass|scss|css)$/],
		});

		const log = [];

		resolver.resolve(
			{},
			fixture,
			"pck2",
			{ log: log.push.bind(log) },
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("No result"));
				expect(result).toEqual(
					path.resolve(fixture, "node_modules/pck2/index.css"),
				);
				expect(
					log.map((line) =>
						line
							.replace(path.resolve(__dirname, ".."), "...")
							.replace(path.resolve(__dirname, ".."), "...")
							.replace(/\\/g, "/"),
					),
				).toMatchSnapshot();
				done();
			},
		);
	});
});
