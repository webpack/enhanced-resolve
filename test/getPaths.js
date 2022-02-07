require("should");

const getPaths = require("../lib/getPaths");

/**
 * @type {[string,{paths: string[], segments: string[]}][]}
 */
const cases = [
	["/a", { paths: ["/a", "/"], segments: ["a", "/"] }],
	["/a/", { paths: ["/a/", "/a", "/"], segments: ["", "a", "/"] }],
	["/a/b", { paths: ["/a/b", "/a", "/"], segments: ["b", "a", "/"] }],
	[
		"/a/b/",
		{ paths: ["/a/b/", "/a/b", "/a", "/"], segments: ["", "b", "a", "/"] }
	],
	["/", { paths: ["/"], segments: [""] }]
];

cases.forEach(case_ => {
	it(case_[0], () => {
		const { paths, segments } = getPaths(case_[0]);
		paths.should.be.eql(case_[1].paths);
		segments.should.be.eql(case_[1].segments);
	});
});
