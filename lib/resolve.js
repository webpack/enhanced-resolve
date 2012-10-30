/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var fs = require("fs");
var createThrottledFunction = require("./createThrottledFunction");
var statCache = {}, readFileCache = {};
var statAsync = createThrottledFunction(fs.stat, 2000, Object.create(statCache));
var statSync = createThrottledFunction(function(pathname, callback) {
	try { callback(null, fs.statSync(pathname)); } catch(e) { callback(e) }
}, 4000, statCache);
var readFileAsync = createThrottledFunction(fs.readFile, 2000, Object.create(readFileCache));
var readFileSync = createThrottledFunction(function(pathname, enc, callback) {
	try { callback(null, fs.readFileSync(pathname, enc)); } catch(e) { callback(e) }
}, 4000, readFileCache);

// http://nodejs.org/docs/v0.4.8/api/all.html#all_Together...


function resolve(context, identifier, options, type, sync, callback) {
	function finalResult(err, absoluteFilename) {
		if(err) {
			callback(new Error("Module \"" + identifier + "\" not found in context \"" +
						context + "\"\n  " + err));
			return;
		}
		callback(null, absoluteFilename);
	}
	var identArray = split(identifier);
	var contextArray = split(context);
	while(options.alias[identArray[0]]) {
		var old = identArray[0];
		identArray[0] = options.alias[identArray[0]];
		identArray = split(path.join.apply(path, identArray));
		if(identArray[0] === old)
			break;
	}
	if(identArray[0] === "." || identArray[0] === ".." || identArray[0] === "" || identArray[0].match(/^[A-Z]:$/i)) {
		var pathname = identArray[0][0] === "." ? join(contextArray, identArray) : join(identArray, []);
		if(type === "context") {
			(sync?statSync:statAsync)(pathname, function(err, stat) {
				if(err) {
					finalResult(err);
					return;
				}
				if(!stat.isDirectory()) {
					finalResult(new Error("Context \"" + identifier + "\" in not a directory"));
					return;
				}
				callback(null, pathname);
			});
		} else {
			loadAsFileOrDirectory(pathname, options, type, sync, finalResult);
		}
	} else {
		loadNodeModules(contextArray, identArray, options, type, sync, finalResult);
	}
}

function doResolve(context, identifier, options, type, sync, callback) {
	var identifiers = identifier.replace(/^!|!$/g, "").replace(/!!/g, "!").split(/!/g);
	var resource = identifiers.pop();
	if(identifier.indexOf("!") === -1) {
		// We need the resource first to check if loaders apply.
		// We have to do it serial.
		resolve(context, resource, options, type, sync, function(err, resource) {
			if(err) return callback(err);
			for(var i = 0; i < options.loaders.length; i++) {
				var line = options.loaders[i];
				var test = line.test;
				if(typeof test == "string") test = new RegExp(test);
				if(test.test(resource)) {
					Array.prototype.push.apply(identifiers, line.loader.split(/!/g));
					break;
				}
			}
			if(identifiers.length == 0) return onResolvedBoth([], resource);

			resolveLoaders(context, identifiers, options, sync, function(err, loaders) {
				if(err) return callback(err);
				onResolvedBoth(loaders, resource);
			});
		});
	} else {
		// Loaders are specified. Do it parallel.
		var fastExit = false;
		var count = 0;
		var loaders, resource;

		resolve(context, resource, options, type, sync, function(err, res) {
			if(err) {
				fastExit = true;
				return callback(err);
			}
			resource = res;
			if(count++) return onResolvedBoth(loaders, resource);
		});
		resolveLoaders(context, identifiers, options, sync, function(err, theLoaders) {
			if(err) {
				fastExit = true;
				return callback(err);
			}
			loaders = theLoaders;
			if(count++) return onResolvedBoth(loaders, resource);
		});
	}
	function onResolvedBoth(loaders, resource) {
		loaders.push(resource);
		var intermediateResult = loaders.join("!");
		var postprocessors = options.postprocess[type].slice(0);
		postprocessors.push(function(result) {
			callback(null, result);
		});
		(function next(err, result) {
			if(err)
				return callback(new Error("File \"" + intermediateResult + "\" is blocked by postprocessors: " + err));
			var postprocessor = postprocessors.shift();
			if(typeof postprocessor == "string") postprocessor = require(postprocessor);
			postprocessor(result, next);
		})(null, intermediateResult);
	}
}

function resolveLoaders(context, identifiers, options, sync, callback) {
	var errors = [];
	var count = identifiers.length;
	function endOne() {
		count--;
		if(count === 0) {
			if(errors.length > 0) {
				callback(new Error(errors.join("\n")));
				return;
			}
			callback(null, identifiers);
		}
	}
	if(count == 0) return endOne(count++);
	identifiers.forEach(function(ident, index) {
		resolve(context, ident, options, "loader", sync, function(err, filename) {
			if(err) {
				errors.push(err);
			} else {
				identifiers[index] = filename;
			}
			endOne()
		});
	});
}

/**
 * sets not defined options to node.js defaults
 */
function setupDefaultOptions(options) {
	if(!options)
		options = {};
	if(!options.extensions)
		options.extensions = ["", ".js"];
	if(!options.loaders)
		options.loaders = [];
	if(!options.postfixes)
		options.postfixes = [""];
	if(!options.packageMains)
		options.packageMains = ["main"];
	if(!options.loaderExtensions)
		options.loaderExtensions = [".node-loader.js", ".loader.js", "", ".js"];
	if(!options.loaderPostfixes)
		options.loaderPostfixes = ["-node-loader", "-loader", ""];
	if(!options.loaderPackageMains)
		options.loaderPackageMains = ["loader", "main"];
	if(!options.paths)
		options.paths = [];
	if(!options.modulesDirectorys)
		options.modulesDirectorys = ["node_modules"];
	if(!options.alias)
		options.alias = {};
	if(!options.postprocess)
		options.postprocess = {};
	if(!options.postprocess.normal)
		options.postprocess.normal = [];
	if(!options.postprocess.context)
		options.postprocess.context = [];
	return options;
}

function createSyncCallback() {
	var err, result;
	function fn(_err, _result) {
		err = _err;
		result = _result;
	}
	fn.get = function() {
		if(err) throw err;
		return result;
	}
	return fn;
}

/**
 * context: absolute filename of current file
 * identifier: module to find
 * options:
 *   paths: array of lookup paths
 * callback: function(err, absoluteFilename)
 */
module.exports = function(context, identifier, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	options = setupDefaultOptions(options);
	return doResolve(context, identifier, options, "normal", false, callback);
}
module.exports.sync = function(context, identifier, options) {
	if(!options) options = {};
	options = setupDefaultOptions(options);
	var callback = createSyncCallback();
	doResolve(context, identifier, options, "normal", true, callback);
	return callback.get();
}
module.exports.setupDefaultOptions = setupDefaultOptions;

module.exports.context = function(context, identifier, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	options = setupDefaultOptions(options);
	return doResolve(context, identifier, options, "context", false, callback);
}
module.exports.context.sync = function(context, identifier, options) {
	if(!options) options = {};
	options = setupDefaultOptions(options);
	var callback = createSyncCallback();
	doResolve(context, identifier, options, "context", true, callback);
	return callback.get();
}

/**
 * callback: function(err, absoluteFilenamesArray)
 */
module.exports.loaders = function(context, identifier, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	options = setupDefaultOptions(options);
	var identifiers = identifier.replace(/^!|!$/g, "").replace(/!!/g, "!").split(/!/g);
	if(identifiers.length == 1 && identifiers[0] == "") return callback(null, []);
	return resolveLoaders(context, identifiers, options, false, callback);
}


function split(a) {
	return a.split(/[\/\\]/g);
}

function join(a, b) {
	var c = [];
	a.forEach(function(x) { c.push(x) });
	b.forEach(function(x) { c.push(x) });
	if(c[0] === "") // fix *nix paths
		c[0] = "/";
	return path.join.apply(path, c);
}

function loadAsFile(filename, options, type, sync, callback) {
	var extensions = type === "loader" ? options.loaderExtensions : options.extensions;
	var tries = extensions.map(function(ext) {
		return filename + ext;
	});
	var count = tries.length;
	var results = tries.slice(0);
	tries.forEach(function forEachTryFn(test, idx) {
		(sync?statSync:statAsync)(test, function loadAsFileTryCallback(err, stat) {
			results[idx] = (err || !stat || !stat.isFile()) ? null : test;
			count--;
			if(count === 0) {
				for(var i = 0; i < tries.length; i++) {
					if(results[i]) return callback(null, tries[i]);
				}
				return callback(new Error("Non of this files exists: " + tries.join(", ")));
			}
		});
	});
}

function loadAsDirectory(dirname, options, type, sync, callback) {
	(sync?statSync:statAsync)(dirname, function(err, stats) {
		if(err || !stats || !stats.isDirectory()) {
			return callback(new Error(dirname + " is not a directory"));
		}
		var packageJsonFile = join(split(dirname), ["package.json"]);
		(sync?statSync:statAsync)(packageJsonFile, function(err, stats) {
			var mainModule = "index";
			if(!err && stats.isFile()) {
				(sync?readFileSync:readFileAsync)(packageJsonFile, "utf-8", function(err, content) {
					if(err) {
						callback(err);
						return;
					}
					try {
						content = JSON.parse(content);
					} catch (jsonError) {
						return callback(jsonError);
					}
					var packageMains = type === "loader" ? options.loaderPackageMains : options.packageMains;
					for(var i = 0; i < packageMains.length; i++) {
						var field = packageMains[i];
						if(content[field]) {
							mainModule = content[field];
							break;
						}
					}
					loadAsFile(join(split(dirname), [mainModule]), options, type, sync, function(err, absoluteFilename) {
						if(!err) return callback(null, absoluteFilename);
						loadAsFile(join(split(dirname), [mainModule, "index"]), options, type, sync, function(err2, absoluteFilename) {
							if(err2) return callback(err);
							return callback(null, absoluteFilename);
						})
					});
				});
			} else
				loadAsFile(join(split(dirname), [mainModule]), options, type, sync, callback);
		});
	});
}

function loadAsFileOrDirectory(pathname, options, type, sync, callback) {
	var result = null;
	var counter = 0;
	var error = null;
	var fastExit = false;
	loadAsFile(pathname, options, type, sync, function loadAsFileOrDirectoryFileResultCallback(err, absoluteFilename) {
		if(err)
			error = err;
		else {
			fastExit = true;
			return callback(null, absoluteFilename);
		}
		if(counter++) bothDone();
	});
	loadAsDirectory(pathname, options, type, sync, function loadAsFileOrDirectoryDirectoryResultCallback(err, absoluteFilename) {
		if(err) {
			if(!error) error = err;
		} else {
			result = absoluteFilename;
		}
		if(counter++) bothDone();
	});
	function bothDone() {
		if(fastExit) return;
		if(result)
			callback(null, result);
		else
			callback(error);
	}
}

function loadNodeModules(context, identifier, options, type, sync, callback) {
	var moduleName = identifier.shift();
	var postfixes = type === "loader" ? options.loaderPostfixes : options.postfixes;
	var paths = nodeModulesPaths(context, options);
	(sync?iterateSync:iterateAsync)(options.paths, function(path, idx, next) {
		usePath(path, next);
	}, function() {
		(sync?iterateSync:iterateAsync)(paths, function(path, idx, next) {
			(sync?statSync:statAsync)(path, function(err, stat) {
				if(err || !stat || !stat.isDirectory())
					return next();
				usePath(path, next);
			});
		}, function() {
			callback(new Error("non in any path of paths"));
		});
	});
	function usePath(path, next) {
		var dirs = [];
		postfixes.forEach(function(postfix) {
			dirs.push(join(split(path), [moduleName+postfix]));
		});
		var count = dirs.length;
		var results = dirs.slice(0);
		var fastExit = false;
		dirs.forEach(function(dir, idx) {
			var pathname = join(split(dir), identifier);
			if(type === "context") {
				(sync?statSync:statAsync)(pathname, function(err, stat) {
					results[idx] = (err || !stat.isDirectory()) ? null : pathname;
					endOne(idx);
				});
			} else {
				loadAsFileOrDirectory(pathname, options, type, sync, function loadAsFileOrDirectoryCallback(err, absoluteFilename) {
					results[idx] = err ? null : absoluteFilename;
					endOne(idx);
				});
			}
		});
		function endOne(idx) {
			if(fastExit) return;
			count--;
			if(count === 0) {
				for(var i = 0; i < results.length; i++) {
					if(results[i])
						return callback(null, results[i]);
				}
				next();
			} else if(results[idx]) {
				for(var i = 0; i < idx; i++) {
					if(results[i])
						return;
				}
				fastExit = true;
				return callback(null, results[idx]);
			}
		}
	}
}

function nodeModulesPaths(context, options) {
	var parts = context;
	var root = 0;
	options.modulesDirectorys.forEach(function(dir) {
		var index = parts.indexOf(dir)-1;
		if(index >= 0 && index < root)
			root = index;
	});
	var dirs = [];
	for(var i = parts.length; i > root; i--) {
		if(options.modulesDirectorys.indexOf(parts[i-1]) >= 0)
			continue;
		var part = parts.slice(0, i);
		options.modulesDirectorys.forEach(function(dir) {
			dirs.push(join(part, [dir]));
		});
	}
	return dirs;
}

function iterateAsync(array, fn, cb) {
	var i = 0;
	(function next() {
		var item = array[i++];
		if(!item) return cb();
		return fn(item, i-1, next);
	})();
}

function iterateSync(array, fn, cb) {
	var cond = true;
	for(var i = 0; i < array.length && cond; i++) {
		cond = false;
		fn(array[i], i, next);
	}
	if(cond) cb();
	function next() {
		cond = true;
	}
}