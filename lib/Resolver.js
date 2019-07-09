/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { AsyncSeriesBailHook, AsyncSeriesHook, SyncHook } = require("tapable");
const createInnerContext = require("./createInnerContext");
const {
	normalize,
	cachedJoin: join,
	getType,
	PathType
} = require("./pathUtils");

function toCamelCase(str) {
	return str.replace(/-([a-z])/g, str => str.substr(1).toUpperCase());
}

class Resolver {
	constructor(fileSystem) {
		this.fileSystem = fileSystem;
		this.hooks = {
			resolveStep: new SyncHook(["hook", "request"], "resolveStep"),
			noResolve: new SyncHook(["request", "error"], "noResolve"),
			resolve: new AsyncSeriesBailHook(
				["request", "resolveContext"],
				"resolve"
			),
			result: new AsyncSeriesHook(["result", "resolveContext"], "result")
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
			return (this.hooks[name] = new AsyncSeriesBailHook(
				["request", "resolveContext"],
				name
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
		if (!sync) {
			throw new Error(
				"Cannot 'resolveSync' because the fileSystem is not sync. Use 'resolve'!"
			);
		}
		if (err) throw err;
		return result;
	}

	resolve(context, path, request, resolveContext, callback) {
		const obj = {
			context: context,
			path: path,
			request: request
		};

		const message = `resolve '${request}' in '${path}'`;

		const finishResolved = result => {
			return callback(
				null,
				result.path === false ? false : result.path + (result.query || ""),
				result
			);
		};

		const finishWithoutResolve = log => {
			/**
			 * @type {Error & {details?: string}}
			 */
			const error = new Error("Can't " + message);
			error.details = log.join("\n");
			this.hooks.noResolve.call(obj, error);
			return callback(error);
		};

		if (resolveContext.log) {
			// We need log anyway to capture it in case of an error
			const log = [];
			return this.doResolve(
				this.hooks.resolve,
				obj,
				message,
				{
					log: msg => {
						resolveContext.log(msg);
						log.push(msg);
					},
					fileDependencies: resolveContext.fileDependencies,
					contextDependencies: resolveContext.contextDependencies,
					missingDependencies: resolveContext.missingDependencies,
					stack: resolveContext.stack
				},
				(err, result) => {
					if (err) return callback(err);

					if (result) return finishResolved(result);

					return finishWithoutResolve(log);
				}
			);
		} else {
			// Try to resolve assuming there is no error
			// We don't log stuff in this case
			return this.doResolve(
				this.hooks.resolve,
				obj,
				message,
				{
					log: undefined,
					fileDependencies: resolveContext.fileDependencies,
					contextDependencies: resolveContext.contextDependencies,
					missingDependencies: resolveContext.missingDependencies,
					stack: resolveContext.stack
				},
				(err, result) => {
					if (err) return callback(err);

					if (result) return finishResolved(result);

					// log is missing for the error details
					// so we redo the resolving for the log info
					// this is more expensive to the success case
					// is assumed by default

					const log = [];

					return this.doResolve(
						this.hooks.resolve,
						obj,
						message,
						{
							log: msg => log.push(msg),
							stack: resolveContext.stack
						},
						(err, result) => {
							if (err) return callback(err);

							return finishWithoutResolve(log);
						}
					);
				}
			);
		}
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
				/**
				 * Prevent recursion
				 * @type {Error & {recursion?: boolean}}
				 */
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
					fileDependencies: resolveContext.fileDependencies,
					contextDependencies: resolveContext.contextDependencies,
					missingDependencies: resolveContext.missingDependencies,
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
		return getType(path) === PathType.Normal;
	}

	/**
	 * @param {string} path a path
	 * @returns {boolean} true, if the path is a directory path
	 */
	isDirectory(path) {
		return path.endsWith("/");
	}

	join(path, request) {
		return join(path, request);
	}

	normalize(path) {
		return normalize(path);
	}
}

module.exports = Resolver;
