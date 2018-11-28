/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { AsyncSeriesBailHook, AsyncSeriesHook, SyncHook } = require("tapable");
const createInnerContext = require("./createInnerContext");

const REGEXP_NOT_MODULE = /^\.$|^\.[\\/]|^\.\.$|^\.\.[\\/]|^\/|^[A-Z]:[\\/]/i;
const REGEXP_DIRECTORY = /[\\/]$/i;

const memoizedJoin = new Map();
const memoryFsJoin = require("memory-fs/lib/join");
const memoryFsNormalize = require("memory-fs/lib/normalize");

function withName(name, hook) {
	hook.name = name;
	return hook;
}

function toCamelCase(str) {
	return str.replace(/-([a-z])/g, str => str.substr(1).toUpperCase());
}

class Resolver {
	constructor(fileSystem) {
		this.fileSystem = fileSystem;
		this.hooks = {
			resolveStep: withName("resolveStep", new SyncHook(["hook", "request"])),
			noResolve: withName("noResolve", new SyncHook(["request", "error"])),
			resolve: withName(
				"resolve",
				new AsyncSeriesBailHook(["request", "resolveContext"])
			),
			result: new AsyncSeriesHook(["result", "resolveContext"])
		};
	}

	ensureHook(name) {
		if (typeof name !== "string") {
			return name;
		}
		name = toCamelCase(name);
		if (/^before/.test(name)) {
			return this.ensureHook(
				name[6].toLowerCase() + name.substr(7)
			).withOptions({
				stage: -10
			});
		}
		if (/^after/.test(name)) {
			return this.ensureHook(
				name[5].toLowerCase() + name.substr(6)
			).withOptions({
				stage: 10
			});
		}
		const hook = this.hooks[name];
		if (!hook) {
			return (this.hooks[name] = withName(
				name,
				new AsyncSeriesBailHook(["request", "resolveContext"])
			));
		}
		return hook;
	}

	getHook(name) {
		if (typeof name !== "string") {
			return name;
		}
		name = toCamelCase(name);
		if (/^before/.test(name)) {
			return this.getHook(name[6].toLowerCase() + name.substr(7)).withOptions({
				stage: -10
			});
		}
		if (/^after/.test(name)) {
			return this.getHook(name[5].toLowerCase() + name.substr(6)).withOptions({
				stage: 10
			});
		}
		const hook = this.hooks[name];
		if (!hook) {
			throw new Error(`Hook ${name} doesn't exist`);
		}
		return hook;
	}

	resolveSync(context, path, request) {
		let err,
			result,
			sync = false;
		this.resolve(context, path, request, {}, (e, r) => {
			err = e;
			result = r;
			sync = true;
		});
		if (!sync)
			throw new Error(
				"Cannot 'resolveSync' because the fileSystem is not sync. Use 'resolve'!"
			);
		if (err) throw err;
		return result;
	}

	resolve(context, path, request, resolveContext, callback) {
		const obj = {
			context: context,
			path: path,
			request: request
		};

		const message = "resolve '" + request + "' in '" + path + "'";

		// Try to resolve assuming there is no error
		// We don't log stuff in this case
		return this.doResolve(
			this.hooks.resolve,
			obj,
			message,
			{
				missing: resolveContext.missing,
				stack: resolveContext.stack
			},
			(err, result) => {
				if (!err && result) {
					return callback(
						null,
						result.path === false ? false : result.path + (result.query || ""),
						result
					);
				}

				const localMissing = new Set();
				const log = [];

				return this.doResolve(
					this.hooks.resolve,
					obj,
					message,
					{
						log: msg => {
							if (resolveContext.log) {
								resolveContext.log(msg);
							}
							log.push(msg);
						},
						missing: localMissing,
						stack: resolveContext.stack
					},
					(err, result) => {
						if (err) return callback(err);

						const error = new Error("Can't " + message);
						error.details = log.join("\n");
						error.missing = Array.from(localMissing);
						this.hooks.noResolve.call(obj, error);
						return callback(error);
					}
				);
			}
		);
	}

	doResolve(hook, request, message, resolveContext, callback) {
		const stackLine =
			hook.name +
			": (" +
			request.path +
			") " +
			(request.request || "") +
			(request.query || "") +
			(request.directory ? " directory" : "") +
			(request.module ? " module" : "");

		let newStack;
		if (resolveContext.stack) {
			newStack = new Set(resolveContext.stack);
			if (resolveContext.stack.has(stackLine)) {
				// Prevent recursion
				const recursionError = new Error(
					"Recursion in resolving\nStack:\n  " +
						Array.from(newStack).join("\n  ")
				);
				recursionError.recursion = true;
				if (resolveContext.log)
					resolveContext.log("abort resolving because of recursion");
				return callback(recursionError);
			}
			newStack.add(stackLine);
		} else {
			newStack = new Set([stackLine]);
		}
		this.hooks.resolveStep.call(hook, request);

		if (hook.isUsed()) {
			const innerContext = createInnerContext(
				{
					log: resolveContext.log,
					missing: resolveContext.missing,
					stack: newStack
				},
				message
			);
			return hook.callAsync(request, innerContext, (err, result) => {
				if (err) return callback(err);
				if (result) return callback(null, result);
				callback();
			});
		} else {
			callback();
		}
	}

	parse(identifier) {
		if (identifier === "") return null;
		const part = {
			request: "",
			query: "",
			module: false,
			directory: false,
			file: false
		};
		const idxQuery = identifier.indexOf("?");
		if (idxQuery === 0) {
			part.query = identifier;
		} else if (idxQuery > 0) {
			part.request = identifier.slice(0, idxQuery);
			part.query = identifier.slice(idxQuery);
		} else {
			part.request = identifier;
		}
		if (part.request) {
			part.module = this.isModule(part.request);
			part.directory = this.isDirectory(part.request);
			if (part.directory) {
				part.request = part.request.substr(0, part.request.length - 1);
			}
		}
		return part;
	}

	isModule(path) {
		return !REGEXP_NOT_MODULE.test(path);
	}

	isDirectory(path) {
		return REGEXP_DIRECTORY.test(path);
	}

	join(path, request) {
		let cacheEntry;
		let pathCache = memoizedJoin.get(path);
		if (typeof pathCache === "undefined") {
			memoizedJoin.set(path, (pathCache = new Map()));
		} else {
			cacheEntry = pathCache.get(request);
			if (typeof cacheEntry !== "undefined") return cacheEntry;
		}
		cacheEntry = memoryFsJoin(path, request);
		pathCache.set(request, cacheEntry);
		return cacheEntry;
	}

	normalize(path) {
		return memoryFsNormalize(path);
	}
}

module.exports = Resolver;
