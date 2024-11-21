const path = require('path');

// Should be used in comparing results: inside .isEqual(...) or another similar function
// Also sometimes it's necessary to use posixSep in executing process of library (thing inside expect):
// aliasFields, importFields, exportFields - these things require posix path separator by the Node.js
// Documentation reference for exports field for example:
// "All paths defined in the "exports" must be relative file URLs starting with './'" (https://nodejs.org/api/packages.html#exports)\
// Exception in tests: when we pass aliasFields, importFields, exportFields right to the library function and not parse it from package.json file itself,
// we should correctly handle osBasedPathSeparator (obps) also.
const posixPathSeparator = '/';
const absoluteOsBasedResolvedPath = path.sep === '/' ? '/' : 'X:/';

// Should be used on executing library code in tests: inside expect(...) or another similar function
const osBasedPathSeparator = path.sep;
// If path starts with posix path separator, we should use win32 absolute path in tests
const absoluteOsBasedPath = path.sep === '/' ? '/' : 'X:\\';

// Test should be executed with win32 path separators, but result of the test should be compared against posix path separators.
// Concept: we pass "X:\\" or "..\\new\\path" but the library takes responsibility to transform win32 path separator to posix path separator
// that's why we receive results like "X:/new/path" - win32 path but with posix separators. Windows can handle posix separator correct, so
// we can use it in our interest - to make support for Windows paths easier.
// With this idea in mind, we can write all the code in project based on single difference in win32 and posix paths - absolute paths. Everything else is going to work the same way on different OS.

// This function is used to transfer path from win32 to posix path separator. It usually used in tests to compare results. We can omit this by refactor all the existing tests
// where a test use something like this "path.resolve(fixture, '/example/index.js')" code in expecting result. Right now, I'm solving another problem, so I'm not going to do it right now - just to make less
// changes in existing tests and make this transition to Windows-friendly code easier.
const transferPathToPosix = (path) => path.replace(/\\/g, '/');

module.exports = {
    absoluteOsBasedPath,
    absoluteOsBasedResolvedPath,
		posixSep: posixPathSeparator,
		obps: osBasedPathSeparator,
    transferPathToPosix,
};
