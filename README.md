# enhanced-resolve

Offers a async require.resolve function. It's highly configurable.

[![Build Status](https://secure.travis-ci.org/webpack/enhanced-resolve.png?branch=master)](http://travis-ci.org/webpack/enhanced-resolve)

More documentation coming soon...

## Request Format

relative: `./file`, `.././../folder/./file`

absolute: `/home/file`, `C:\folder\file`

module: `module`, `module/with/sub/file`

query: `resourceFile?query` (with resourceFile one of above, and query be any string)

loaders: `loader!resource`, `loader1!loader2!resource` (with loader and resource each one of above)

Example: `raw!./customLoader?evil,strict!C:\fail\loader?fail=big!../file.js?charset=utf-8`


## Methods

``` javascript
var resolve = require("enhanced-resolve");

// Resolve a normal request
resolve(context: String, identifier: String, options: Object, callback: (err: Error, result: String) => void) => void
resolve.sync(context: String, identifier: String, options: Object) => String

// Resolve a context request, which means the result should be a folder
resolve.context(context: String, identifier: String, options: Object, callback: (err: Error, result: String) => void) => void
resolve.context.sync(context: String, identifier: String, options: Object) => String

// Only resolve loaders, a array of resolved loaders is the result
resolve.loaders(context: String, identifier: String, options: Object, callback: (err: Error, result: String[]) => void) => void
resolve.loaders.sync(context: String, identifier: String, options: Object) => String[]

// parse a request
resolve.parse(identifier: String) => {loaders: Part[], resource: Part}

// stringify a parsed request
resolve.stringify(parsed: {loaders: Part[], resource: Part}) => String

// the type used for parse and stringify
type Part { path: String, query: String, module: Boolean }

// checks if a request part is a module
resolve.parse.isModule(identifierPart: String)
```

## Options

``` javascript
{
  paths: ["/my/absolute/dirname"],
  // default: []
  // search paths for modules

  modulesDirectories: ["xyz_modules", "node_modules"],
  // default: (defaults are NOT included if you define your own)
  //  ["node_modules"];
  // directories to be searched for modules

  alias: {
   "old-module": "new-module",
   "another-module": "new-module/more/stuff"
  },
  // replace a module

  extensions: ["", ".www.js", ".js"],
  // defaults: (defaults are NOT included if you define your own)
  //   ["", ".js"]
  // postfixes for files to try

  packageMains: ["abc", "main"]
  // defaults: ["main"]
  // lookup fields in package.json

  loaderExtensions: [".loader.js", ".www-loader.js", "", ".js"],
  // defaults: (defaults are NOT included if you define your own)
  //   [".node-loader.js", ".loader.js", "", ".js"]
  // postfixes for loaders to try

  loaderPostfixes: ["-loader", "-xyz", ""],
  // defaults: (defaults are NOT included if you define your own)
  //   ["-node-loader", "-loader", ""]
  // postfixes for loader modules to try

  loaderPackageMains: ["myloader", "main"]
  // defaults: ["loader", "main"]
  // lookup fields for loaders in package.json

  loaders: [{
	// test, include and exclude can be undefined, RegExp, string or array of these
    test: /\.generator\.js/,
	include: "\\.js",
    exclude: [
		/\.no\.generator\.js/,
		"\\.nono\\.generator\\.js"
	}
    loader: "val"
  }],
  // default: []
  // automatically use loaders if resolved filename match RegExp
  // and no loader is specified.

  postprocess: {
   normal: [function(filename, callback) {
    // webpack will not find files including ".exclude."
    if(/\.exclude\.[^\\\/]*$/.test(filename))
	 return callback(new Error("File is excluded"));
	callback(null, filename);
   }],
   // defaults: []
   // postprocess resolved filenames by all specified async functions
   // a postprocessor must call the callback
   // You can pass a filename instead of a function
   // The filename is required and the exports are expected to be a function.

   context: [],
   // same as postprocess.normal but for contextes
  }
}
```


*It is used i. e. in [webpack](https://github.com/webpack/webpack) and [Scripted](https://github.com/scripted-editor/scripted)*