const { CachedInputFileSystem } = require("../");

describe("pr-53", () => {
	it("should allow to readJsonSync in CachedInputFileSystem", () => {
		var cfs = new CachedInputFileSystem(
			{
				readFileSync: function (path) {
					return JSON.stringify("abc" + path);
				}
			},
			1000
		);
		if (!cfs.readJsonSync) throw new Error("readJsonSync must be available");
		expect(cfs.readJsonSync("xyz")).toEqual("abcxyz");
	});
});
