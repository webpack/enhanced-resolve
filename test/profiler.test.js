"use strict";

const assert = require("assert");
const { Volume } = require("memfs");
const { ResolverFactory } = require("../");
const { describe, it } = require("./_runner");

describe("ProfilerPlugin", () => {
	it("should collect profile data via resolveContext.profile callback", (t, done) => {
		const fileSystem = Volume.fromJSON({
			"/a/index.js": "",
		});

		const resolver = ResolverFactory.createResolver({
			// @ts-expect-error for tests
			fileSystem,
			extensions: [".js"],
			profile: true,
		});

		const profiles = [];
		resolver.resolve(
			{},
			"/a",
			"./index",
			{
				profile: (data) => profiles.push(data),
			},
			(err, result) => {
				assert.ifError(err);
				assert.strictEqual(result, "/a/index.js");
				assert.strictEqual(profiles.length, 1);
				const [profile] = profiles;
				assert.ok(typeof profile.duration === "number");
				assert.ok(profile.duration >= 0);
				assert.strictEqual(profile.success, true);
				assert.strictEqual(profile.specifier, "./index");
				assert.strictEqual(profile.parent, "/a");
				assert.ok(profile.hooks instanceof Map);
				assert.ok(profile.hooks.size > 0);
				done();
			},
		);
	});

	it("should collect profile data for failed resolutions via factory callback", (t, done) => {
		const fileSystem = Volume.fromJSON({
			"/a/index.js": "",
		});

		const profiles = [];
		const resolver = ResolverFactory.createResolver({
			// @ts-expect-error for tests
			fileSystem,
			extensions: [".js"],
			profile: (data) => profiles.push(data),
		});

		resolver.resolve({}, "/a", "./does-not-exist", {}, (_err, _result) => {
			assert.strictEqual(profiles.length, 1);
			const [profile] = profiles;
			assert.strictEqual(profile.success, false);
			assert.strictEqual(profile.result, null);
			assert.ok(profile.duration >= 0);
			done();
		});
	});

	it("should report hook counts", (t, done) => {
		const fileSystem = Volume.fromJSON({
			"/a/index.js": "",
		});

		const resolver = ResolverFactory.createResolver({
			// @ts-expect-error for tests
			fileSystem,
			extensions: [".js"],
			profile: true,
		});

		const profiles = [];
		resolver.resolve(
			{},
			"/a",
			"./index",
			{
				profile: (data) => profiles.push(data),
			},
			(err) => {
				assert.ifError(err);
				const [profile] = profiles;
				const { hooks } = profile;
				const resolveHook = hooks.get("resolve");
				assert.ok(resolveHook, "should have 'resolve' hook entry");
				assert.ok(resolveHook.count >= 1);
				const existingFile = hooks.get("existingFile");
				assert.ok(existingFile, "should have 'existingFile' hook entry");
				assert.ok(existingFile.count >= 1);
				assert.ok(existingFile.totalTime >= 0);
				done();
			},
		);
	});

	it("should work with multiple resolve calls", (t, done) => {
		const fileSystem = Volume.fromJSON({
			"/a/index.js": "",
			"/a/lib/util.js": "",
		});

		const resolver = ResolverFactory.createResolver({
			// @ts-expect-error for tests
			fileSystem,
			extensions: [".js"],
			profile: true,
		});

		let callCount = 0;
		resolver.resolve(
			{},
			"/a",
			"./index",
			{
				profile: (data) => {
					callCount++;
					assert.ok(data.hooks.size > 0);
				},
			},
			(err) => {
				assert.ifError(err);
				resolver.resolve(
					{},
					"/a",
					"./lib/util",
					{
						profile: (data) => {
							callCount++;
							assert.ok(data.hooks.size > 0);
						},
					},
					(err2) => {
						assert.ifError(err2);
						assert.strictEqual(callCount, 2);
						done();
					},
				);
			},
		);
	});

	it("should work with profile callback in factory options", (t, done) => {
		const fileSystem = Volume.fromJSON({
			"/a/index.js": "",
		});

		const profiles = [];
		const resolver = ResolverFactory.createResolver({
			// @ts-expect-error for tests
			fileSystem,
			extensions: [".js"],
			profile: (data) => profiles.push(data),
		});

		resolver.resolve({}, "/a", "./index", {}, (err) => {
			assert.ifError(err);
			assert.strictEqual(profiles.length, 1);
			const [profile] = profiles;
			assert.ok(profile.duration >= 0);
			assert.strictEqual(profile.success, true);
			done();
		});
	});

	it("should log profile data when resolveContext.log is provided", (t, done) => {
		const fileSystem = Volume.fromJSON({
			"/a/index.js": "",
		});

		const resolver = ResolverFactory.createResolver({
			// @ts-expect-error for tests
			fileSystem,
			extensions: [".js"],
			profile: true,
		});

		const logs = [];
		resolver.resolve(
			{},
			"/a",
			"./index",
			{
				log: (msg) => logs.push(msg),
				profile: () => {},
			},
			(err) => {
				assert.ifError(err);
				const profileLogs = logs.filter((m) => m.trim().startsWith("profile:"));
				assert.ok(profileLogs.length > 0);
				assert.ok(
					profileLogs.some((m) => m.trim().startsWith("profile: resolved")),
				);
				done();
			},
		);
	});
});
