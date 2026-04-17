# enhanced-resolve

[![npm][npm]][npm-url]
[![Build Status][build-status]][build-status-url]
[![codecov][codecov-badge]][codecov-url]
[![Install Size][size]][size-url]
[![GitHub Discussions][discussion]][discussion-url]

Offers an async require.resolve function. It's highly configurable.

## Features

- plugin system
- provide a custom filesystem
- sync and async node.js filesystems included

## Getting Started

### Install

```sh
# npm
npm install enhanced-resolve
# or Yarn
yarn add enhanced-resolve
```

### Resolve

There is a Node.js API which allows to resolve requests according to the Node.js resolving rules.
Sync, async (callback) and promise APIs are offered. A `create` method allows to create a custom resolve function.

```js
const resolve = require("enhanced-resolve");

resolve("/some/path/to/folder", "module/dir", (err, result) => {
	result; // === "/some/path/node_modules/module/dir/index.js"
});

resolve.sync("/some/path/to/folder", "../../dir");
// === "/some/path/dir/index.js"

const result = await resolve.promise("/some/path/to/folder", "../../dir");
// === "/some/path/dir/index.js"

const myResolve = resolve.create({
	// or resolve.create.sync / resolve.create.promise
	extensions: [".ts", ".js"],
	// see more options below
});

myResolve("/some/path/to/folder", "ts-module", (err, result) => {
	result; // === "/some/node_modules/ts-module/index.ts"
});
```

### Creating a Resolver

The easiest way to create a resolver is to use the `createResolver` function on `ResolveFactory`, along with one of the supplied File System implementations.

```js
const fs = require("fs");
const { CachedInputFileSystem, ResolverFactory } = require("enhanced-resolve");

// create a resolver
const myResolver = ResolverFactory.createResolver({
	// Typical usage will consume the `fs` + `CachedInputFileSystem`, which wraps Node.js `fs` to add caching.
	fileSystem: new CachedInputFileSystem(fs, 4000),
	extensions: [".js", ".json"],
	/* any other resolver options here. Options/defaults can be seen below */
});

// resolve a file with the new resolver
const context = {};
const lookupStartPath = "/Users/webpack/some/root/dir";
const request = "./path/to-look-up.js";
const resolveContext = {};
myResolver.resolve(
	context,
	lookupStartPath,
	request,
	resolveContext,
	(err /* Error */, filepath /* string */) => {
		// Do something with the path
	},
);
```

#### Resolver Options

| Field               | Default                     | Description                                                                                                                                                                                                                                                                                 |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| alias               | []                          | A list of module alias configurations or an object which maps key to value                                                                                                                                                                                                                  |
| aliasFields         | []                          | A list of alias fields in description files                                                                                                                                                                                                                                                 |
| extensionAlias      | {}                          | An object which maps extension to extension aliases                                                                                                                                                                                                                                         |
| cachePredicate      | function() { return true }; | A function which decides whether a request should be cached or not. An object is passed to the function with `path` and `request` properties.                                                                                                                                               |
| cacheWithContext    | true                        | If unsafe cache is enabled, includes `request.context` in the cache key                                                                                                                                                                                                                     |
| conditionNames      | []                          | A list of exports field condition names                                                                                                                                                                                                                                                     |
| descriptionFiles    | ["package.json"]            | A list of description files to read from                                                                                                                                                                                                                                                    |
| enforceExtension    | false                       | Enforce that a extension from extensions must be used                                                                                                                                                                                                                                       |
| exportsFields       | ["exports"]                 | A list of exports fields in description files                                                                                                                                                                                                                                               |
| extensions          | [".js", ".json", ".node"]   | A list of extensions which should be tried for files                                                                                                                                                                                                                                        |
| fallback            | []                          | Same as `alias`, but only used if default resolving fails                                                                                                                                                                                                                                   |
| fileSystem          |                             | The file system which should be used                                                                                                                                                                                                                                                        |
| fullySpecified      | false                       | Request passed to resolve is already fully specified and extensions or main files are not resolved for it (they are still resolved for internal requests)                                                                                                                                   |
| mainFields          | ["main"]                    | A list of main fields in description files                                                                                                                                                                                                                                                  |
| mainFiles           | ["index"]                   | A list of main files in directories                                                                                                                                                                                                                                                         |
| modules             | ["node_modules"]            | A list of directories to resolve modules from, can be absolute path or folder name                                                                                                                                                                                                          |
| plugins             | []                          | A list of additional resolve plugins which should be applied                                                                                                                                                                                                                                |
| resolver            | undefined                   | A prepared Resolver to which the plugins are attached                                                                                                                                                                                                                                       |
| resolveToContext    | false                       | Resolve to a context instead of a file                                                                                                                                                                                                                                                      |
| preferRelative      | false                       | Prefer to resolve module requests as relative request and fallback to resolving as module                                                                                                                                                                                                   |
| preferAbsolute      | false                       | Prefer to resolve server-relative urls as absolute paths before falling back to resolve in roots                                                                                                                                                                                            |
| restrictions        | []                          | A list of resolve restrictions                                                                                                                                                                                                                                                              |
| roots               | []                          | A list of root paths                                                                                                                                                                                                                                                                        |
| symlinks            | true                        | Whether to resolve symlinks to their symlinked location                                                                                                                                                                                                                                     |
| tsconfig            | false                       | TypeScript config for paths mapping. Can be `false` (disabled), `true` (use default `tsconfig.json`), a string path to `tsconfig.json`, or an object with `configFile`, `references`, and `baseUrl` options. Supports JSONC format (comments and trailing commas) like TypeScript compiler. |
| tsconfig.configFile | tsconfig.json               | Path to the tsconfig.json file                                                                                                                                                                                                                                                              |
| tsconfig.references | []                          | Project references. `'auto'` to load from tsconfig, or an array of paths to referenced projects                                                                                                                                                                                             |
| tsconfig.baseUrl    | undefined                   | Override baseUrl from tsconfig.json. If provided, this value will be used instead of the baseUrl in the tsconfig file                                                                                                                                                                       |
| unsafeCache         | false                       | Use this cache object to unsafely cache the successful requests                                                                                                                                                                                                                             |

## Plugins

Similar to `webpack`, the core of `enhanced-resolve` functionality is implemented as individual plugins that are executed using [`tapable`](https://github.com/webpack/tapable).
These plugins can extend the functionality of the library, adding other ways for files/contexts to be resolved.

A plugin should be a `class` (or its ES5 equivalent) with an `apply` method. The `apply` method will receive a `resolver` instance, that can be used to hook in to the event system.

Plugins are executed in a pipeline, and register which event they should be executed before/after. `source` is the name of the event that starts the pipeline, and `target` is what event this plugin should fire, which is what continues the execution of the pipeline. For a full view of how these plugin events form a chain, see `lib/ResolverFactory.js`, in the `//// pipeline ////` section.

### Built-in Plugins

`enhanced-resolve` ships with the following plugins. Most of them are wired up automatically by `ResolverFactory` based on the [resolver options](#resolver-options); the ones exported from the package entry (`TsconfigPathsPlugin`, `CloneBasenamePlugin`, `LogInfoPlugin`) are the ones you're most likely to use explicitly.

| Plugin                                | Purpose                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `AliasPlugin`                         | Replaces a matching request with one or more alternative targets. Powers the `alias` and `fallback` options.                         |
| `AliasFieldPlugin`                    | Applies aliasing based on a field in the description file (e.g. the `browser` field). Powers `aliasFields`.                          |
| `AppendPlugin`                        | Appends a string (typically an extension) to the current path. Used for `extensions`.                                                |
| `CloneBasenamePlugin`                 | Joins the current directory basename onto the path (e.g. `/foo/bar` → `/foo/bar/bar`). Useful for directory-named main-file schemes. |
| `ConditionalPlugin`                   | Forwards the request only when it matches a given partial request shape.                                                             |
| `DescriptionFilePlugin`               | Finds and loads the nearest description file (e.g. `package.json`) so other plugins can read its fields. Powers `descriptionFiles`.  |
| `DirectoryExistsPlugin`               | Only continues the pipeline if the current path is an existing directory.                                                            |
| `ExportsFieldPlugin`                  | Resolves requests through the `exports` field of a package's description file. Powers `exportsFields` and `conditionNames`.          |
| `ExtensionAliasPlugin`                | Maps one extension to a list of alternative extensions (e.g. `.js` → `.ts`, `.js`). Powers `extensionAlias`.                         |
| `FileExistsPlugin`                    | Only continues the pipeline if the current path is an existing file, and records the file as a dependency.                           |
| `ImportsFieldPlugin`                  | Resolves `#name` requests through the `imports` field of the enclosing package.                                                      |
| `JoinRequestPlugin`                   | Joins the current path with the current request into a new path.                                                                     |
| `JoinRequestPartPlugin`               | Splits a module request into module name + inner request, joining the inner request onto the path.                                   |
| `LogInfoPlugin`                       | Emits verbose log output at a given pipeline step. Handy for debugging resolves via `resolveContext.log`.                            |
| `MainFieldPlugin`                     | Uses a field in the description file (e.g. `main`) to point to the entry file of a package. Powers `mainFields`.                     |
| `ModulesInHierarchicalDirectoriesPlugin` | Searches for a module by walking up parent directories (the standard `node_modules` lookup). Powers `modules`.                    |
| `ModulesInRootPlugin`                 | Searches for a module in a single absolute directory. Powers absolute-path entries in `modules`.                                     |
| `NextPlugin`                          | Forwards the request from one hook to another without modification — glue between pipeline steps.                                    |
| `ParsePlugin`                         | Parses a raw request string into its components (path, query, fragment, module flag, etc.).                                          |
| `PnpPlugin`                           | Resolves module requests through a Yarn PnP API when one is available.                                                               |
| `RestrictionsPlugin`                  | Rejects results that don't match a list of path restrictions (strings or regular expressions). Powers `restrictions`.                |
| `ResultPlugin`                        | Terminal plugin that fires the `result` hook — signals a successful resolve.                                                         |
| `RootsPlugin`                         | Resolves server-relative URL requests (starting with `/`) against one or more root directories. Powers `roots`.                      |
| `SelfReferencePlugin`                 | Resolves a package self-reference (e.g. `my-pkg/foo` from within `my-pkg`).                                                          |
| `SymlinkPlugin`                       | Realpaths the resolved file by following symlinks. Can be disabled via the `symlinks` option.                                        |
| `TryNextPlugin`                       | Forwards the request to the next hook with a log message. Useful for trying alternative resolutions.                                 |
| `TsconfigPathsPlugin`                 | Rewrites requests using the `paths` and `baseUrl` from a `tsconfig.json`. Powers the `tsconfig` option.                              |
| `UnsafeCachePlugin`                   | Caches successful resolves in an in-memory map to speed up repeated requests. Powers `unsafeCache`.                                  |
| `UseFilePlugin`                       | Joins a fixed filename onto the current path (e.g. `index`). Powers `mainFiles`.                                                     |

### Plugin Boilerplate

```js
class MyResolverPlugin {
	constructor(source, target) {
		this.source = source;
		this.target = target;
	}

	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("MyResolverPlugin", (request, resolveContext, callback) => {
				// Any logic you need to create a new `request` can go here
				resolver.doResolve(target, request, null, resolveContext, callback);
			});
	}
}
```

### Writing a Custom Plugin

The example below adds a plugin that rewrites any request starting with `my-lib/` to `my-lib/src/`. It taps the `described-resolve` hook (after the description file has been located) and forwards the rewritten request to `resolve`, so the pipeline restarts with the new request.

```js
const { ResolverFactory, CachedInputFileSystem } = require("enhanced-resolve");
const fs = require("fs");

class MyLibSrcPlugin {
	apply(resolver) {
		const target = resolver.ensureHook("resolve");
		resolver
			.getHook("described-resolve")
			.tapAsync("MyLibSrcPlugin", (request, resolveContext, callback) => {
				if (!request.request || !request.request.startsWith("my-lib/")) {
					return callback();
				}
				const newRequest = {
					...request,
					request: request.request.replace(/^my-lib\//, "my-lib/src/"),
				};
				resolver.doResolve(
					target,
					newRequest,
					`rewrote my-lib → my-lib/src`,
					resolveContext,
					callback,
				);
			});
	}
}

const myResolver = ResolverFactory.createResolver({
	fileSystem: new CachedInputFileSystem(fs, 4000),
	extensions: [".js", ".json"],
	plugins: [new MyLibSrcPlugin()],
});
```

Tips for writing your own plugin:

- Call `callback()` with no arguments to pass the request on to the next tapped handler at the same `source` hook. This is how you "opt out" when a request doesn't apply.
- Call `resolver.doResolve(target, newRequest, message, resolveContext, callback)` to continue the pipeline at a different hook with a (possibly modified) request.
- Return early with `callback(null, result)` to short-circuit with a specific result, or `callback(err)` to fail the resolve.
- Common hook names you'll see as `source`/`target`: `resolve`, `parsed-resolve`, `described-resolve`, `raw-resolve`, `normal-resolve`, `relative`, `directory`, `file`, `existing-file`, `resolved`. Read `lib/ResolverFactory.js` for the full pipeline.

## Escaping

It's allowed to escape `#` as `\0#` to avoid parsing it as fragment.

enhanced-resolve will try to resolve requests containing `#` as path and as fragment, so it will automatically figure out if `./some#thing` means `.../some.js#thing` or `.../some#thing.js`. When a `#` is resolved as path it will be escaped in the result. Here: `.../some\0#thing.js`.

## Tests

```sh
npm run test
```

## Passing options from webpack

If you are using `webpack`, and you want to pass custom options to `enhanced-resolve`, the options are passed from the `resolve` key of your webpack configuration e.g.:

```
resolve: {
  extensions: ['.js', '.jsx'],
  modules: [path.resolve(__dirname, 'src'), 'node_modules'],
  plugins: [new DirectoryNamedWebpackPlugin()]
  ...
},
```

## License

Copyright (c) 2012-2019 JS Foundation and other contributors

MIT (http://www.opensource.org/licenses/mit-license.php)

[npm]: https://img.shields.io/npm/v/enhanced-resolve.svg
[npm-url]: https://www.npmjs.com/package/enhanced-resolve
[build-status]: https://github.com/webpack/enhanced-resolve/actions/workflows/test.yml/badge.svg
[build-status-url]: https://github.com/webpack/enhanced-resolve/actions
[codecov-badge]: https://codecov.io/gh/webpack/enhanced-resolve/branch/main/graph/badge.svg?token=6B6NxtsZc3
[codecov-url]: https://codecov.io/gh/webpack/enhanced-resolve
[size]: https://packagephobia.com/badge?p=enhanced-resolve
[size-url]: https://packagephobia.com/result?p=enhanced-resolve
[discussion]: https://img.shields.io/github/discussions/webpack/webpack
[discussion-url]: https://github.com/webpack/webpack/discussions
