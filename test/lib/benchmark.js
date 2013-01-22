var ConstFileSystem = require("./ConstFileSystem");
var LoggedFileSystem = require("./LoggedFileSystem");
var CachedFileSystem = require("./CachedFileSystem");
var AsyncFileSystem = require("./AsyncFileSystem");
var DebugFileSystem = require("./DebugFileSystem");
var TestContents = require("./TestContents");
var Resolver = require("../../lib/Resolver");
var ModulesInDirectoriesPlugin = require("../../lib/ModulesInDirectoriesPlugin");
var ModuleAsDirectoryPlugin = require("../../lib/ModuleAsDirectoryPlugin");
var ModuleDefaultFilePlugin = require("../../lib/ModuleDefaultFilePlugin");
var ModuleDescriptionFilePlugin = require("../../lib/ModuleDescriptionFilePlugin");
var FileAppendPlugin = require("../../lib/FileAppendPlugin");

var cases = [
	{
		title: "relative file",
		content: "simple",
		context: "/home/user/app/lib",
		resolve: "./file"
	},
	{
		title: "module with index file",
		content: "simple",
		context: "/home/user/app/lib",
		resolve: "usermodule1"
	},
	{
		title: "module with package.json",
		content: "simple",
		context: "/home/user/app/lib",
		resolve: "usermodule2"
	},
	{
		title: "module with package.json",
		content: "simple",
		context: "/home/user/app/lib",
		resolve: "usermodule2/main"
	},
	{
		title: "module as file",
		content: "simple",
		context: "/home/user/app/lib",
		resolve: "usermodule3"
	},
	{
		title: "missing module",
		content: "simple",
		context: "/home/user/app/lib",
		resolve: "usermodule4"
	},
	{
		title: "module with index file (depth)",
		content: "depth",
		context: "/home/user/app/lib/directory",
		resolve: "usermodule1"
	},
	{
		title: "missing module (depth)",
		content: "depth",
		context: "/home/user/app/lib/directory",
		resolve: "usermodule4"
	},
];

var i = 0;
(function next() {
	var testCase = cases[i++];
	if(!testCase) return;
	var loggedFs = new LoggedFileSystem(new DebugFileSystem(new ConstFileSystem(TestContents[testCase.content])));
	var fs = new AsyncFileSystem(new CachedFileSystem(loggedFs));
	var resolver = new Resolver(fs);
	resolver.apply(
		new ModulesInDirectoriesPlugin("node", ["web_modules", "node_modules"]),
		new ModuleAsDirectoryPlugin("node"),
		new ModuleDescriptionFilePlugin("package.json", ["webpack", "browserify", "web", "main"]),
		new ModuleDefaultFilePlugin(["index"]),
		new FileAppendPlugin(["", ".web.js", ".js"])
	);

	var stopTick = false;
	var ticks = 0;
	process.nextTick(function tick() {
		if(stopTick) return;
		ticks++;
		// console.log("tick");
		process.nextTick(tick);
	});
	resolver.resolve(testCase.context, testCase.resolve, function(err, result) {
		console.log(testCase.title + ": " + testCase.resolve + " in " + testCase.context);
		if(err) console.log("err -> " + err);
		else console.log("-> " + result);
		console.log("stat: " + loggedFs.count.stat +
			", readFile: " + loggedFs.count.readFile +
			", readdir: " + loggedFs.count.readdir +
			", ticks: " + ticks);
		console.log("");
		stopTick = true;
		process.nextTick(process.nextTick.bind(null, next));
	});
})();