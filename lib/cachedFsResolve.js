var resolveFactory = require("./resolve");

// use node.js fs
var fs = require("fs");

// caching factory
var createThrottledFunction = require("./createThrottledFunction");

// the cache objects
var statCache = {}, readFileCache = {};

// create the functions with the factory
// the sync version have higher priority as it finishes earlier
// caching time is 4 seconds
var statAsync = createThrottledFunction(fs.stat, 4000, Object.create(statCache));
var statSync = createThrottledFunction(function(pathname, callback) {
	try { callback(null, fs.statSync(pathname)); } catch(e) { callback(e) }
}, 4000, statCache);
var readFileAsync = createThrottledFunction(fs.readFile, 4000, Object.create(readFileCache));
var readFileSync = createThrottledFunction(function(pathname, enc, callback) {
	try { callback(null, fs.readFileSync(pathname, enc)); } catch(e) { callback(e) }
}, 4000, readFileCache);

// create the resolve function
module.exports = resolveFactory({
	// use the created functions
	statAsync:		statAsync,
	statSync:		statSync,
	readFileAsync:	readFileAsync,
	readFileSync:	readFileSync,

	// use standard JSON parser
	parsePackage:	JSON.parse
});