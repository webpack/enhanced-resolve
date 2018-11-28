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
		});
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
			[
				{
					type: "node",
					features: ["es5", "es6"]
				},
				{
					type: "node",
					features: ["es5"]
				},
				true
			],
			[
				"node+es5+es6",
				{
					type: "node",
					features: ["es5"]
				},
				true
			],
			[
				{
					type: "node",
					features: ["es5", "es6"]
				},
				"*+es5",
				true
			]
		];
		TESTS.forEach(function(testCase) {
			it(
				"should say '" +
					testCase[1] +
					"' is " +
					(testCase[2] ? "matched" : "not matched") +
					" in '" +
					testCase[0] +
					"'",
				function() {
					concord
						.isTypeMatched(testCase[0], testCase[1])
						.should.be.eql(testCase[2]);
				}
			);
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
			["./**.js", "./dir/abc.js", true],
			["./**.js", "./abc.js", true],
			["./**", "./dir/abc.js", true],
			["./**", "./abc.js", true],
			["./abc-**.js", "./abc-x.js", true],
			["./abc-**.js", "./abc-xyz.js", true],
			["./abc-**.js", "./xyz.js", false],
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
			["(\\.js$)", "./dir/abc.js", true],
			["(\\.js$)", "./dir/abc.js.css", false]
		];
		TESTS.forEach(function(testCase) {
			it(
				"should say '" +
					testCase[1] +
					"' is " +
					(testCase[2] ? "matched" : "not matched") +
					" in '" +
					testCase[0] +
					"'",
				function() {
					concord
						.isGlobMatched(testCase[0], testCase[1])
						.should.be.eql(testCase[2]);
				}
			);
		});
	});

	describe("isConditionMatched", function() {
		var context = {
			supportedResourceTypes: [
				"promise+lazy/*",
				"stylesheet/sass+mixins",
				"stylesheet/sass+functions/incorrect"
			],
			environments: ["web+es5+dom+xhr", "web+es5+xhr"],
			referrer: "./main.css"
		};
		var TESTS = {
			web: true,
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
			"referrer:*.css": true,
			"referrer:  *.css": true,
			"referrer:*.js": false,
			"referrer: *.js": false,
			"referrer:./**/*": true,
			"referrer:./**": true,
			"referrer:!./**": false,
			"unknown:any": false
		};
		Object.keys(TESTS).forEach(function(key) {
			var expected = TESTS[key];
			it(
				"should say '" + key + "' is " + (expected ? "matched" : "not matched"),
				function() {
					concord.isConditionMatched(context, key).should.be.eql(expected);
				}
			);
		});
	});

	describe("getMain", function() {
		var context = {
			supportedResourceTypes: [],
			environments: ["web+es5+dom+xhr"],
			referrer: "module"
		};
		var TESTS = [
			{
				main: "yes"
			},
			{
				main: "no",
				"[web]main": "yes"
			},
			{
				main: "no",
				"[   web  ]   [\t*+es5]\t\tmain": "yes"
			},
			{
				"[web] main": "yes"
			},
			{
				main: "yes",
				"[ node ] main": "no"
			},
			{
				main: "no",
				"[ web ] main": "yes",
				"[ node ] main": "no"
			},
			{
				main: "no",
				"[ referrer: module ] main": "yes"
			},
			{
				main: "no",
				"[ web] main": "no",
				"[*+es5 ] main": "yes"
			}
		];
		TESTS.forEach(function(testCase) {
			it("should get the main from " + JSON.stringify(testCase), function() {
				concord.getMain(context, testCase).should.be.eql("yes");
			});
		});
	});

	describe("getExtensions", function() {
		it("should allow to access the extensions field", function() {
			concord
				.getExtensions(
					{},
					{
						extensions: [".js"]
					}
				)
				.should.be.eql([".js"]);
		});
	});

	describe("matchModule", function() {
		var context = {
			supportedResourceTypes: [],
			environments: ["web+es5+dom+xhr"]
		};
		var config1 = {
			modules: {
				"./a.js": "./new-a.js",
				"./b.js": "./new/b.js",
				"./ccc/c.js": "./c.js",
				"./ddd/d.js": "./ddd/dd.js",
				"./dir/**": "./new/**",
				"./empty.js": false,
				module: "./replacement-module.js",
				"templates/**": "./templates/**",
				fs: "fake-fs",
				abc: "./abc",
				"abc/**": "./dir-abc/**",
				"jquery**": "./jquery**",
				"xyz/*.js": "./not-used.js",
				"xyz/*.css": "./xxx/*.css",
				"fff/**/*.css": "./ggg/**/*.js"
			}
		};
		var config2 = {
			modules: {
				"./overwrite.*": "./overwritten.*",
				"./overwrite.js": "./wrong",
				"./*.css": "./*.match",
				"./*.match": "./success-*.matched-css",
				"(regexp-([^-]*))": "regexp/$1"
			}
		};
		var TESTS = [
			[{}, "./no-field.js", "./no-field.js"],
			[config1, "./normal.js", "./normal.js"],
			[config1, "./a.js", "./new-a.js"],
			[config1, "./b.js", "./new/b.js"],
			[config1, "./ccc/c.js", "./c.js"],
			[config1, "./ddd/d.js", "./ddd/dd.js"],
			[config1, "./dir/c.js", "./new/c.js"],
			[config1, "./dir/sub/c.js", "./new/sub/c.js"],
			[config1, "./empty.js", false],
			[config1, "module", "./replacement-module.js"],
			[config1, "templates/abc.ring", "./templates/abc.ring"],
			[config1, "fs", "fake-fs"],
			[config1, "abc", "./abc"],
			[config1, "abc/def", "./dir-abc/def"],
			[config1, "abc/def/ghi", "./dir-abc/def/ghi"],
			[config1, "jquery", "./jquery"],
			[config1, "jquery/jquery.js", "./jquery/jquery.js"],
			[config1, "xyz/rrr.js", "./not-used.js"],
			[config1, "xyz/rrr.css", "./xxx/rrr.css"],
			[config1, "fff/wfe.css", "./ggg/wfe.js"],
			[config1, "fff/jht/wfe.css", "./ggg/jht/wfe.js"],
			[config1, "fff/jht/222/wfe.css", "./ggg/jht/222/wfe.js"],
			[config2, "./overwrite.js", "./overwritten.js"],
			[config2, "./matched-again.css", "./success-matched-again.matched-css"],
			[config2, "./some/regexp-match.js", "./some/regexp/match.js"],
			[
				config2,
				"./overwrite.regexp-test.css",
				"./success-overwritten.regexp/test.matched-css"
			]
		];
		TESTS.forEach(function(testCase) {
			it(
				"should map '" + testCase[1] + "' to '" + testCase[2] + "'",
				function() {
					var actual = concord.matchModule(context, testCase[0], testCase[1]);
					actual.should.be.eql(testCase[2]);
				}
			);
		});
		it("should throw an exception on recursive configuration", function() {
			(function() {
				concord.matchModule(
					{},
					{
						modules: {
							a: "b",
							b: "c",
							c: "a"
						}
					},
					"b"
				);
			}.should.throw("Request 'b' matches recursively"));
		});
	});

	describe("matchType", function() {
		var context = {
			supportedResourceTypes: [],
			environments: ["web+es5+dom+xhr"]
		};
		var TESTS = [
			[
				"should get a type",
				{
					types: {
						"*.test": "hello/world"
					}
				},
				"hello/world"
			],
			[
				"should get a type from list",
				{
					types: {
						"*.js": "any/javascript+commonjs",
						"*.test": "hello/world",
						"*.css": "stylesheet/css"
					}
				},
				"hello/world"
			],
			[
				"should get a type with conditions",
				{
					types: {
						"*.test": "hello/world",
						"[*+es5] *.test": "hello/es5",
						"[web] *.test": "hello/web"
					}
				},
				"hello/web"
			],
			[
				"should get a type with complete override",
				{
					types: {
						"*.test": "hello/world",
						"[web] *.test": "hello/wrong"
					},
					"[web] types": {
						"*.js": "hello/web"
					}
				},
				undefined
			],
			[
				"should get a type with multiple matches",
				{
					types: {
						"*.test": "hello/world",
						"./abc.test": "hello/abs"
					}
				},
				"hello/abs"
			],
			[
				"should get a type with multiple matches 2",
				{
					types: {
						"./abc.test": "hello/abs",
						"*.test": "hello/world"
					}
				},
				"hello/world"
			],
			[
				"should get a type with star match",
				{
					types: {
						"./abc.test": "hello/world",
						"*.test": "super/*"
					}
				},
				"super/hello/world"
			],
			["should get a type without types field", {}, undefined]
		];
		TESTS.forEach(function(testCase) {
			it(testCase[0], function() {
				var result = concord.matchType(context, testCase[1], "./abc.test");
				if (testCase[2]) result.should.be.eql(testCase[2]);
				else (typeof result).should.be.eql(typeof testCase[2]);
			});
		});
		it("should throw an exception on incomplete star match", function() {
			(function() {
				concord.matchType(
					{},
					{
						types: {
							"*.test": "super/*"
						}
					},
					"./abc.test"
				);
			}.should.throw(
				"value ('super/*') of key '*.test' contains '*', but there is no previous value defined"
			));
		});
	});
});
