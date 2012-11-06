var resolveFactory = require("../../lib/resolve");

module.exports = function(fs) {
	return resolveFactory({
		readdir: fs.readdir.bind(fs),
		readFile: fs.readFile.bind(fs),
		stat: fs.stat.bind(fs),
		parsePackage: JSON.parse
	});
}