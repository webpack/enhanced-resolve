"use strict";

const assert = require("assert");
const { describe, it } = require("node:test");

const { forEachBail } = require("../");

describe("forEachBail", () => {
	it("should iterate correctly", (t, done) => {
		const log = [];
		forEachBail(
			[0, 1, 2, 3, 4, 5, 6],
			(value, callback) => {
				log.push(value);
				if (value % 4 === 0) return callback(null, undefined);
				if (value % 2 === 0) return callback();
				if (value === 5) return callback(null, { path: "test" });
				process.nextTick(callback);
			},
			(err, result) => {
				if (err) return done(err);
				if (!result) return done(new Error("Should have result"));
				assert.deepStrictEqual(result, { path: "test" });
				assert.deepStrictEqual(log, [0, 1, 2, 3, 4, 5]);
				done();
			},
		);
	});

	it("should handle empty array", (t, done) => {
		forEachBail(
			[],
			() => {
				done(new Error("Should not be called"));
			},
			(err, result) => {
				assert.strictEqual(err, undefined);
				assert.strictEqual(result, undefined);
				done();
			},
		);
	});

	it("should sync finish with undefined", (t, done) => {
		forEachBail(
			[2, 3, 4, 5, 6],
			(value, callback) => callback(),
			(err, result) => {
				assert.strictEqual(err, undefined);
				assert.strictEqual(result, undefined);
				done();
			},
		);
	});

	it("should async finish with undefined", (t, done) => {
		forEachBail(
			[2, 3, 4, 5, 6],
			(value, callback) => {
				process.nextTick(callback);
			},
			(err, result) => {
				assert.strictEqual(err, undefined);
				assert.strictEqual(result, undefined);
				done();
			},
		);
	});
});
