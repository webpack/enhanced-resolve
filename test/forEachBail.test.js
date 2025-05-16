const { forEachBail } = require("../");

describe("forEachBail", () => {
	it("should iterate correctly", (done) => {
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
				expect(result).toEqual({ path: "test" });
				expect(log).toEqual([0, 1, 2, 3, 4, 5]);
				done();
			}
		);
	});
	it("should handle empty array", (done) => {
		forEachBail(
			[],
			() => {
				done(new Error("Should not be called"));
			},
			(err, result) => {
				expect(err).toBeUndefined();
				expect(result).toBeUndefined();
				done();
			}
		);
	});
	it("should sync finish with undefined", (done) => {
		forEachBail(
			[2, 3, 4, 5, 6],
			(value, callback) => {
				return callback();
			},
			(err, result) => {
				expect(err).toBeUndefined();
				expect(result).toBeUndefined();
				done();
			}
		);
	});
	it("should async finish with undefined", (done) => {
		forEachBail(
			[2, 3, 4, 5, 6],
			(value, callback) => {
				process.nextTick(callback);
			},
			(err, result) => {
				expect(err).toBeUndefined();
				expect(result).toBeUndefined();
				done();
			}
		);
	});
});
