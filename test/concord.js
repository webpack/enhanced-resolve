var should = require("should");
var concord = require("../lib/concord");

describe("concord", function() {
	describe("parseType", function() {
		var TESTS = {
			"hello-world": {
				type: "hello-world",
				features: []
			},
			"hello+world": {
				type: "hello",
				features: ["world"]
			},
			"node+es5+es6+esmodules": {
				type: "node",
				features: ["es5", "es6", "esmodules"]
			},
			"*+dom": {
				type: null,
				features: ["dom"]
			},
			"*": {
				type: null,
				features: []
			},
			"*+hello-world": {
				type: null,
				features: ["hello-world"]
			}
		};
		Object.keys(TESTS).forEach(function(key) {
			it("should parse " + key, function() {
				concord.parseType(key).should.be.eql(TESTS[key]);
			});
		})
	});

	describe("isTypeMatched", function() {
		var TESTS = [
			["node+es5", "node+es5", true],
			["node+es5", "node", true],
			["node+es5", "node+es6", false],
			["node+es5", "web", false],
			["node+es5", "web+es5", false],
			["node+es5+es6", "node+es6", true],
			["node+es5+es6", "node+es7", false],
			["node+es5+es6", "node+es6+es5", true],
			["node+es5+es6", "node+es6+es7", false],
			["node+es5+es6", "*+es5", true],
			["node+es5+es6", "*+es6", true],
			["node+es5+es6", "*+es7", false],
			["node+es5+es6", "*", true],
			[{
				type: "node",
				features: ["es5", "es6"]
			}, {
				type: "node",
				features: ["es5"]
			}, true],
			["node+es5+es6", {
				type: "node",
				features: ["es5"]
			}, true],
			[{
				type: "node",
				features: ["es5", "es6"]
			}, "*+es5", true]
		];
		TESTS.forEach(function(testCase) {
			it("should say '" + testCase[1] + "' is " + (testCase[2] ? "matched" : "not matched") + " in '" + testCase[0] + "'", function() {
				concord.isTypeMatched(testCase[0], testCase[1]).should.be.eql(testCase[2]);
			});
		});
	});

	describe("isGlobMatched", function() {
		var TESTS = [
			["module", "module", true],
			["moduleA", "moduleB", false],
			["./a.js", "./a.js", true],
			["./a.js", ".\\a.js", true],
			["./*.js", "./abc.js", true],
			["./*.js", "./dir/abc.js", false],
			["./**/*.js", "./dir/abc.js", true],
			["./**/*.js", "./abc.js", true],
			["./**.js", "./dir/abc.js", false],
			["./???.js", "./abc.js", true],
			["./???.js", "./abcd.js", false],
			["./???.js", "./ab.js", false],
			["*.js", "./abc.js", true],
			["*.js", "./dir/abc.js", true],
			["*.js", "./dir/abc.jsx", false],
			["*.{js,jsx}", "./dir/abc.js", true],
			["*.{js,jsx}", "./dir/abc.jsx", true],
			["{*.js,*.jsx}", "./dir/abc.jsx", true],
			["{*.js,*.jsx}", "./dir/abc.js", true],
			["{module,{*.js,*.jsx}}", "module", true],
			["{module,{*.js,*.jsx}}", "./dir/abc.js", true],
			["{module,{*.js,*.jsx}}", "./dir/abc.jsx", true],
			["module[1-5]", "module4", true],
			["module[1-5]", "module7", false],
			["module[!1-5]", "module4", false],
			["module[!1-5]", "module7", true],
			["module[!1-5]", "module77", false],
			["./a,{b,c},d.js", "./a,b,d.js", true],
			["./a,{b,c},d.js", "./a,c,d.js", true],
			["./a,{b,c},d.js", "./a.js", false],
			["./@(a|b|c).js", "./.js", false],
			["./@(a|b|c).js", "./a.js", true],
			["./@(a|b|c).js", "./ab.js", false],
			["./@(a|b|c).js", "./abc.js", false],
			["./?(a|b|c).js", "./.js", true],
			["./?(a|b|c).js", "./a.js", true],
			["./?(a|b|c).js", "./ab.js", false],
			["./?(a|b|c).js", "./abc.js", false],
			["./+(a|b|c).js", "./.js", false],
			["./+(a|b|c).js", "./a.js", true],
			["./+(a|b|c).js", "./ab.js", true],
			["./+(a|b|c).js", "./abc.js", true],
			["./*(a|b|c).js", "./.js", true],
			["./*(a|b|c).js", "./a.js", true],
			["./*(a|b|c).js", "./ab.js", true],
			["./a|b.js", "./a.js", false],
			["./a|b.js", "./a|b.js", true],
		];
		TESTS.forEach(function(testCase) {
			it("should say '" + testCase[1] + "' is " + (testCase[2] ? "matched" : "not matched") + " in '" + testCase[0] + "'", function() {
				concord.isGlobMatched(testCase[0], testCase[1]).should.be.eql(testCase[2]);
			});
		});
	});

	describe("isConditionMatched", function() {
		var context = {
			supportedResourceTypes: ["promise+lazy/*", "stylesheet/sass+mixins"],
			environments: ["web+es5+dom+xhr", "web+es5+xhr"]
		}
		var TESTS = {
			"web": true,
			"web+es5": true,
			"*+es6": false,
			"*+es5": true,
			"*+es6|*+es5": true,
			"*+dom": false,
			"!*+xhr": false,
			"!*+es6": true,
			"!*+es5|!node": true,
			"!*+es5|!web": false,
			"promise/*": true,
			"promise+lazy/*": true,
			"promise+eager/*": false,
			"stylesheet/sass": true,
			"stylesheet/sass+mixins": true,
			"stylesheet/sass+functions": false,
			"stylesheet/sass+mixins+functions": false,
		};
		Object.keys(TESTS).forEach(function(key) {
			var expected = TESTS[key];
			it("should say '" + key + "' is " + (expected ? "matched" : "not matched"), function() {
				concord.isConditionMatched(context, key).should.be.eql(expected);
			});
		});
	});

	describe("getMain", function() {
		var context = {
			supportedResourceTypes: [],
			environments: ["web+es5+dom+xhr"]
		};
		var TESTS = [{
			"main": "yes"
		}, {
			"main": "no",
			"[web]main": "yes"
		}, {
			"main": "no",
			"[   web  ]   [\t*+es5]\t\tmain": "yes"
		}, {
			"[web] main": "yes"
		}, {
			"main": "yes",
			"[ node ] main": "no"
		}, {
			"main": "no",
			"[ web ] main": "yes",
			"[ node ] main": "no"
		}, {
			"main": "no",
			"[ web] main": "no",
			"[*+es5 ] main": "yes"
		}];
		TESTS.forEach(function(testCase) {
			it("should get the main from " + JSON.stringify(testCase), function() {
				concord.getMain(context, testCase).should.be.eql("yes");
			});
		});
	});

	describe("getExtensions", function() {
		it("should allow to access the extensions field", function() {
			concord.getExtensions({}, {
				extensions: [".js"]
			}).should.be.eql([".js"]);
		});
	});

	describe("matchType", function() {
		var context = {
			supportedResourceTypes: [],
			environments: ["web+es5+dom+xhr"]
		};
		var TESTS = [
			["should get a type", {
				"types": {
					"*.test": "hello/world"
				}
			}, "hello/world"],
			["should get a type from list", {
				"types": {
					"*.js": "any/javascript+commonjs",
					"*.test": "hello/world",
					"*.css": "stylesheet/css"
				}
			}, "hello/world"],
			["should get a type with conditions", {
				"types": {
					"*.test": "hello/world",
					"[*+es5] *.test": "hello/es5",
					"[web] *.test": "hello/web",
				}
			}, "hello/web"],
			["should get a type with complete override", {
				"types": {
					"*.test": "hello/world",
					"[web] *.test": "hello/wrong"
				},
				"[web] types": {
					"*.js": "hello/web"
				}
			}, undefined],
			["should get a type with multiple matches", {
				"types": {
					"*.test": "hello/world",
					"./abc.test": "hello/abs"
				}
			}, "hello/abs"],
			["should get a type with multiple matches 2", {
				"types": {
					"./abc.test": "hello/abs",
					"*.test": "hello/world"
				}
			}, "hello/world"],
			["should get a type without types field", {}, undefined],
		];
		TESTS.forEach(function(testCase) {
			it(testCase[0], function() {
				var result = concord.matchType(context, testCase[1], "./abc.test");
				if(testCase[2])
					result.should.be.eql(testCase[2]);
				else
					(typeof result).should.be.eql(typeof testCase[2]);
			})
		});
	})
});
