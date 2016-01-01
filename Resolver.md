# Resolver

## 1. `resolve`

``` js
{
	context: Object, // Context information
	path: String, // The directory for which is resolved
	request: String | Object, // The request which should be resolved
}
```

* Check if request is cached and shortcut return here (`CachePlugin`)
* Parse request and continue with 1.1. (`ParsePlugin`)

### 1.1. `parsed-resolve`

* Load description file in any parent folder (`DescriptionFilePlugin`)
  * Continue with 2.
* Containue with 2.

## 2. `described-resolve`

``` js
{
	descriptionFileData: Object, // The description file
	descriptionFileRoot: String, // The directory of the description file
	descriptionFilePath: String, // The path of the description file
	descriptionFileName: String, // The filename of the description file
	...
	query: String, // The query string of the request
	directory: Boolean, // The request is a directory (not a file)
	module: Boolean // The request is a module (not relative or absolute)
}
```

* Check if an alias is configurated (`AliasPlugin`)
  * Continue with 1.
* Check if an alias is configurated in description file (`FieldAliasPlugin`, `ConcordModulesPlugin`)
  * Continue with 1.
* Decide wheter to continue with (`RequestKindPlugin`)
  * 3. when request is a module
  * 4. when request is a directory (ends with /)
  * 2.1.

### 2.1. `file-or-directory`

* Continue with 5.
* Continue with 6.

(Both tried in parallel)

## 3. `module`

``` js
{
	descriptionFileData: Object,
	descriptionFileRoot: String,
	descriptionFilePath: String,
	descriptionFileName: String,
	context: Object,
	path: String,
	request: String, // i. e. "module/file"
	query: String,
	directory: Boolean
}
```

* Apply module templates and continue with 3.1. (`ModuleTemplatesPlugin`)

### 3.1. `templated-module`

* Try to resolve in module directories (`ModulesInRootPlugin`, `ModulesInDirectoriesPlugin`)
  * Continue with 1.

## 4. `directory`

``` js
{
	descriptionFileData: Object,
	descriptionFileRoot: String,
	descriptionFilePath: String,
	descriptionFileName: String,
	context: Object,
	path: String, // The path of the directory
	query: String
}
```

* Check if path is a directory (`DirectoryExistsPlugin`)
  * Continue with 4.1.

### 4.1. `existing-directory`

* Check if directory is the same then description file directory (`MainFieldPlugin`)
  * Try main field and continue with 1.
* Check if directory contains index file (`DefaultFilePlugin`)
  * Continue with 5.

## 5. `file`

``` js
{
	descriptionFileData: Object,
	descriptionFileRoot: String,
	descriptionFilePath: String,
	descriptionFileName: String,
	context: Object,
	path: String, // The path of the file
	query: String
}
```

* Try to continue with 6.
* For each possible extension in description file and configurated (`AppendPlugin`, `ConcordExtensionsPlugin`)
  * Continue with 6.

## 6. `extended-file`

``` js
{
	descriptionFileData: Object,
	descriptionFileRoot: String,
	descriptionFilePath: String,
	descriptionFileName: String,
	context: Object,
	path: String, // The resolved filepath
	query: String
}
```

* Check if an alias is configurated in description file (`ConcordModulesPlugin`)
  * Continue with 1.
* Check if file is an symlink (`SymlinkExistsPlugin`)
  * Continue with 1.
* Check if file exists (`FileExistsPlugin`)
  * Continue with 7.

### 6.1. `resolved`

* Return result (`ResultPlugin`)

## 7. `result` (serial async plugin)

``` js
{
	descriptionFileData: Object,
	descriptionFileRoot: String,
	descriptionFilePath: String,
	descriptionFileName: String,
	context: Object,
	path: String,
	query: String
}
```

* Read file type of request from description file (`ConcordTypePlugin`)
  * Add this info to the object
* Store result into cache (`CachePlugin`)
* Return the result

## Returned result

``` js
{
	descriptionFileData: Object,
	descriptionFileRoot: String,
	descriptionFilePath: String,
	descriptionFileName: String,
	context: Object,
	path: String,
	query: String,
	type: String // Concord type
}
```
