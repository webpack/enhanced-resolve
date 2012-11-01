/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var parse = require("./parse");
var stringify = require("./stringify");
var matchRegExpObject = require("./matchRegExpObject");

// http://nodejs.org/docs/v0.4.8/api/all.html#all_Together...

function syncToAsync(fn) {
	return function(arg1, arg2, callback) {
		if(callback) {
			try {
				callback(null, fn(arg1, arg2));
			} catch(e) {
				callback(e);
			}
		} else {
			try {
				arg2(null, fn(arg1));
			} catch(e) {
				arg2(e);
			}
		}
	}
}

module.exports = function resolveFactory(config) {

var statAsync =		config.stat;
var statSync = 		syncToAsync(config.statSync);
var readFileAsync =	config.readFile;
var readFileSync =	syncToAsync(config.readFileSync);
var readdirAsync =	config.readdir;
var readdirSync =	syncToAsync(config.readdirSync);
var parsePackage =	config.parsePackage;


function resolve(context, resource, options, type, sync, callback) {
	function finalResult(err, absoluteFilename) {
		if(err) {
			callback(new Error("Module \"" + stringify({resource: resource}) + "\" not found in context \"" +
						context + "\"\n  " + err));
			return;
		}
		resource.path = absoluteFilename;
		callback(null, resource);
	}
	applyAlias(resource, options.alias);
	if(resource.module) {
		loadInModuleDirectories(context, resource.path, options, type, sync, finalResult);
	} else {
		var pathname = resource.path[0] === "." ? join(split(context), split(resource.path)) : resource.path;
		if(type === "context") {
			(sync?statSync:statAsync)(pathname, function(err, stat) {
				if(err) {
					finalResult(err);
					return;
				}
				if(!stat.isDirectory()) {
					finalResult(new Error("Context \"" + pathname + "\" in not a directory"));
					return;
				}
				finalResult(null, pathname);
			});
		} else {
			loadAsFileOrDirectory(pathname, options, type, sync, finalResult);
		}
	}
}

function applyAlias(resource, alias) {
	while(resource.path && resource.module) {
		var moduleName = resource.path, remaining = "";
		var idx = moduleName.indexOf("/");
		if(idx >= 0) {
			remaining = moduleName.slice(idx);
			moduleName = moduleName.slice(0, idx);
		}
		if(!alias[moduleName]) return;
		resource.path = alias[moduleName] + remaining;
		resource.module = parse.isModule(resource.path);
	}
}

function doResolve(context, identifier, options, type, sync, callback) {
	var request;
	try {
		request = parse(identifier);
	} catch(e) { return callback(e); }
	var resource = request.resource;
	if(request.loaders === null && resource === null) {
		// We want to resolve an empty identifier
		return onResolvedBoth();
	} else if(request.loaders !== null && request.loaders.length === 0 && resource === null) {
		// We want to resolve "!" or "!!" or ...
		return onResolvedBoth();
	} else if(request.loaders === null && resource.path === null) {
		// We want to resolve something like "?query"
		return onResolvedBoth();
	} else if(request.loaders === null && resource.path !== null) {
		// We want to resolve something like "simple" or "./file"
		request.loaders = [];
		// We need the resource first to check if loaders apply.
		// We have to do it serial.
		resolve(context, resource, options, type, sync, function(err) {
			if(err) return callback(err);
			for(var i = 0; i < options.loaders.length; i++) {
				var line = options.loaders[i];
				if(matchRegExpObject(line, resource.path)) {
					var loaders = parse(line.loader + "!").loaders;
					Array.prototype.push.apply(request.loaders, loaders);
					break;
				}
			}
			if(request.loaders.length == 0) return onResolvedBoth();

			resolveLoaders(context, request.loaders, options, sync, function(err) {
				if(err) return callback(err);
				onResolvedBoth();
			});
		});
	} else if(resource === null || resource.path === null) {
		resolveLoaders(context, request.loaders, options, sync, function(err) {
			if(err) return callback(err);
			return onResolvedBoth();
		});
	} else {
		// Loaders are specified. Do it parallel.
		var fastExit = false;
		var count = 0;

		resolve(context, resource, options, type, sync, function(err) {
			if(err && !fastExit) {
				fastExit = true;
				return callback(err);
			}
			if(count++) return onResolvedBoth();
		});
		resolveLoaders(context, request.loaders, options, sync, function(err) {
			if(err && !fastExit) {
				fastExit = true;
				return callback(err);
			}
			if(count++) return onResolvedBoth();
		});
	}
	function onResolvedBoth() {
		var intermediateResult = stringify(request);
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

function resolveLoaders(context, loaders, options, sync, callback) {
	var count = loaders.length;
	if(count == 0) return callback();
	var errors = [];
	function endOne(err) {
		if(err) {
			errors.push(err);
		}
		count--;
		if(count === 0) {
			if(errors.length > 0) {
				callback(new Error(errors.join("\n")));
				return;
			}
			callback(null, loaders);
		}
	}
	loaders.forEach(function(loader) {
		resolve(context, loader, options, "loader", sync, endOne);
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
	if(!options.modulesDirectories)
		options.modulesDirectories = ["node_modules"];
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
var resolveFunction = function resolveFunction(context, identifier, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	options = setupDefaultOptions(options);
	return doResolve(context, identifier, options, "normal", false, callback);
}
resolveFunction.sync = function(context, identifier, options) {
	if(!options) options = {};
	options = setupDefaultOptions(options);
	var callback = createSyncCallback();
	doResolve(context, identifier, options, "normal", true, callback);
	return callback.get();
}
resolveFunction.setupDefaultOptions = setupDefaultOptions;

resolveFunction.context = function(context, identifier, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	options = setupDefaultOptions(options);
	return doResolve(context, identifier, options, "context", false, callback);
}
resolveFunction.context.sync = function(context, identifier, options) {
	if(!options) options = {};
	options = setupDefaultOptions(options);
	var callback = createSyncCallback();
	doResolve(context, identifier, options, "context", true, callback);
	return callback.get();
}

/**
 * callback: function(err, absoluteFilenamesArray)
 */
resolveFunction.loaders = function(context, identifier, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	options = setupDefaultOptions(options);
	try {
		var loaders = parse(identifier + "!").loaders;
	} catch(e) { return callback(e); }
	return resolveLoaders(context, loaders, options, false, function(err, loaders) {
		if(err) return callback(err);
		return callback(null, loaders.map(stringify.part));
	});
}
resolveFunction.loaders.sync = function(context, identifier, options) {
	if(!options) options = {};
	options = setupDefaultOptions(options);
	var callback = createSyncCallback();
	var loaders = parse(identifier + "!").loaders;
	resolveLoaders(context, loaders, options, false, callback);
	return callback.get().map(stringify.part);
}
resolveFunction.parse = parse;
resolveFunction.stringify = stringify;


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
				var notFoundErr = new Error("Non of this files exists: " + tries.join(", "));
				notFoundErr.notImportant = true;
				return callback(notFoundErr);
			}
		});
	});
}

function loadAsDirectory(dirname, options, type, sync, callback) {
	(sync?statSync:statAsync)(dirname, function(err, stats) {
		if(err || !stats || !stats.isDirectory()) {
			var notFoundErr = new Error(dirname + " is not a directory");
			notFoundErr.notImportant = true;
			return callback(notFoundErr);
		}
		var packageJsonFile = join(split(dirname), ["package.json"]);
		(sync?statSync:statAsync)(packageJsonFile, function(err, stats) {
			var mainModule = "index";
			if(!err && stats.isFile()) {
				(sync?readFileSync:readFileAsync)(packageJsonFile, "utf-8", function(err, content) {
					if(err) {
						err.notImportant = true;
						callback(err);
						return;
					}
					try {
						content = parsePackage(content);
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
							if(!err2) return callback(null, absoluteFilename);
							err.notImportant = true;
							return callback(err);
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
		if(err) {
			if(!err.notImportant || !error) error = err;
		} else {
			fastExit = true;
			return callback(null, absoluteFilename);
		}
		if(counter++) bothDone();
	});
	loadAsDirectory(pathname, options, type, sync, function loadAsFileOrDirectoryDirectoryResultCallback(err, absoluteFilename) {
		if(err) {
			if(!error || (error.notImportant && !err.notImportant)) error = err;
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

function loadInModuleDirectories(context, identifier, options, type, sync, callback) {
	var firstError = null;
	var fileInModule = split(identifier);
	var moduleName = fileInModule.shift();
	var postfixes = type === "loader" ? options.loaderPostfixes : options.postfixes;
	var paths = modulesDirectoriesPaths(context, options);
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
			callback(firstError || new Error("non in any path of paths"));
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
			var pathname = join(split(dir), fileInModule);
			if(type === "context") {
				(sync?statSync:statAsync)(pathname, function(err, stat) {
					if(err && !firstError) firstError = err;
					results[idx] = (err || !stat.isDirectory()) ? null : pathname;
					endOne(idx);
				});
			} else {
				loadAsFileOrDirectory(pathname, options, type, sync, function loadAsFileOrDirectoryCallback(err, absoluteFilename) {
					if(err && !firstError) firstError = err;
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

function modulesDirectoriesPaths(context, options) {
	var parts = split(context);
	var root = 0;
	options.modulesDirectories.forEach(function(dir) {
		var index = parts.indexOf(dir)-1;
		if(index >= 0 && index < root)
			root = index;
	});
	var dirs = [];
	for(var i = parts.length; i > root; i--) {
		if(options.modulesDirectories.indexOf(parts[i-1]) >= 0)
			continue;
		var part = parts.slice(0, i);
		options.modulesDirectories.forEach(function(dir) {
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

return resolveFunction;

}