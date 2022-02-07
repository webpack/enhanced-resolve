require("should");

const getPaths = require("../lib/getPaths");

/**
 * @type {[string,{paths: string[], seqments: string[]}][]}
 */
const cases = [
	["/a", { paths: ["/a", "/"], seqments: ["a", "/"] }],
	["/a/", { paths: ["/a/", "/a", "/"], seqments: ["", "a", "/"] }],
	["/a/b", { paths: ["/a/b", "/a", "/"], seqments: ["b", "a", "/"] }],
	[
		"/a/b/",
		{ paths: ["/a/b/", "/a/b", "/a", "/"], seqments: ["", "b", "a", "/"] }
	],
	["/", { paths: ["/"], seqments: [""] }]
];

cases.forEach(case_ => {
	it(case_[0], () => {
		const { paths, seqments } = getPaths(case_[0]);
		paths.should.be.eql(case_[1].paths);
		seqments.should.be.eql(case_[1].seqments);
	});
});
