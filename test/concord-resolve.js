var should = require("should");
var path = require("path");
var resolve = require("../").create({
	concord: true
});
var resolveSync = require("../").create.sync({
	concord: true
});

var fixtures = path.join(__dirname, "concord");

function testResolve(name, context, moduleName, result) {
	it(name, function(done) {
		/*var logData = [];
		callback.log = function(line) {
			logData.push(line);
		}*/
		resolve(
			{
				environments: ["web+es5+dom+xhr"],
				referrer: "test"
			},
			context,
			moduleName,
			callback
		);

		function callback(err, filename) {
			if (err) {
				console.log(err.details);
				return done(err);
			}
			//console.log(logData.join("\n"));
			should.exist(filename);
			filename.should.equal(result);
			done();
		}
	});
	it(name + " (sync)", function() {
		/*var logData = [];
		callback.log = function(line) {
			logData.push(line);
		}*/
		var filename = resolveSync(
			{
				environments: ["web+es5+dom+xhr"],
				referrer: "test"
			},
			context,
			moduleName
		);

		should.exist(filename);
		filename.should.equal(result);
	});
}
describe("concord-resolve", function() {
	testResolve(
		"should prefer concord main field over normal main field (outside)",
		fixtures,
		"./main-field",
		path.join(fixtures, "main-field", "correct.js")
	);
	testResolve(
		"should prefer concord main field over normal main field (inside)",
		path.join(fixtures, "main-field"),
		"./",
		path.join(fixtures, "main-field", "correct.js")
	);

	testResolve(
		"should use specified extensions (outside over main)",
		fixtures,
		"./extensions",
		path.join(fixtures, "extensions", "file.css")
	);
	testResolve(
		"should use specified extensions (outside)",
		fixtures,
		"./extensions/file",
		path.join(fixtures, "extensions", "file.css")
	);
	testResolve(
		"should use specified extensions (inside over main)",
		path.join(fixtures, "extensions"),
		"./",
		path.join(fixtures, "extensions", "file.css")
	);
	testResolve(
		"should use specified extensions (inside)",
		path.join(fixtures, "extensions"),
		"./file",
		path.join(fixtures, "extensions", "file.css")
	);
	testResolve(
		"should use specified extensions (outside) (dir index)",
		fixtures,
		"./extensions/dir",
		path.join(fixtures, "extensions", "dir", "index.ts")
	);
	testResolve(
		"should use specified extensions (inside) (dir index)",
		path.join(fixtures, "extensions"),
		"./dir",
		path.join(fixtures, "extensions", "dir", "index.ts")
	);

	testResolve(
		"should use modules configuration, module (over main)",
		fixtures,
		"./modules",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, module (direct)",
		path.join(fixtures, "modules"),
		"module-a",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, file (direct)",
		path.join(fixtures, "modules"),
		"./wrong.js",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, file (without extension)",
		path.join(fixtures, "modules"),
		"./wrong",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, file (from sub dir)",
		path.join(fixtures, "modules", "sub"),
		"../wrong.js",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, directory (direct 1)",
		path.join(fixtures, "modules"),
		"./dir1/any",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, directory (direct 2)",
		path.join(fixtures, "modules"),
		"./dir1/any/path",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, directory (from sub dir)",
		path.join(fixtures, "modules", "sub"),
		"../dir1/any/path",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, files in directory (direct 2)",
		path.join(fixtures, "modules"),
		"./dir2/correct.js",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, files in directory (from dir)",
		path.join(fixtures, "modules", "dir2"),
		"./correct.js",
		path.join(fixtures, "modules", "correct.js")
	);
	testResolve(
		"should use modules configuration, module (module)",
		path.join(fixtures, "modules"),
		"jquery",
		path.join(fixtures, "modules", "modules", "jquery", "index.js")
	);
	testResolve(
		"should use modules configuration, module (file in module)",
		path.join(fixtures, "modules"),
		"jquery/file",
		path.join(fixtures, "modules", "modules", "jquery", "file.js")
	);
	testResolve(
		"should use modules configuration, module (from dir)",
		path.join(fixtures, "modules", "dir2"),
		"jquery",
		path.join(fixtures, "modules", "modules", "jquery", "index.js")
	);
});
