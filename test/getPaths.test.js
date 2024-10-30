const getPaths = require("../lib/getPaths");
const { posixSep } = require("./util/path-separator");

/**
 * @type {[string,{paths: string[], segments: string[]}][]}
 */
const cases = [
	[
		`${posixSep}a`,
		{ paths: [`${posixSep}a`, `${posixSep}`], segments: ["a", `${posixSep}`] }
	],
	[
		`${posixSep}a${posixSep}`,
		{
			paths: [`${posixSep}a${posixSep}`, `${posixSep}a`, `${posixSep}`],
			segments: ["", "a", `${posixSep}`]
		}
	],
	[
		`${posixSep}a${posixSep}b`,
		{
			paths: [`${posixSep}a${posixSep}b`, `${posixSep}a`, `${posixSep}`],
			segments: ["b", "a", `${posixSep}`]
		}
	],
	[
		`${posixSep}a${posixSep}b${posixSep}`,
		{
			paths: [
				`${posixSep}a${posixSep}b${posixSep}`,
				`${posixSep}a${posixSep}b`,
				`${posixSep}a`,
				`${posixSep}`
			],
			segments: ["", "b", "a", `${posixSep}`]
		}
	],
	[`${posixSep}`, { paths: [`${posixSep}`], segments: [""] }]
];

cases.forEach(case_ => {
	it(case_[0], () => {
		const { paths, segments } = getPaths(case_[0]);
		expect(paths).toEqual(case_[1].paths);
		expect(segments).toEqual(case_[1].segments);
	});
});
