/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var popPathSeqment = require("./popPathSeqment");

function ResultSymlinkPlugin(appendings) {
}
module.exports = ResultSymlinkPlugin;

ResultSymlinkPlugin.prototype.apply = function(resolver) {
	resolver.plugin("result", function(request, callback) {
		var fs = this.fileSystem;
		var paths = [request.path];
		var pathSeqments = [];
		var addr = [request.path];
		var pathSeqment = popPathSeqment(addr);
		while(pathSeqment) {
			pathSeqments.push(pathSeqment);
			paths.push(addr[0]);
			pathSeqment = popPathSeqment(addr);
		}
		pathSeqments.push(paths[paths.length-1]);
		var log = callback.log;
		var missing = callback.missing;
		this.forEachBail(paths.map(function(_, i) { return i; }), function(idx, callback) {
			fs.readlink(paths[idx], function(err, result) {
				if(!err && result) {
					pathSeqments[idx] = result;
					return callback(null, idx);
				}
				callback();
			});
		}, function(err, idx) {
			if(typeof idx !== "number") return callback();
			var resultSeqments = pathSeqments.slice(0, idx+1);
			var result = resultSeqments.reverse().reduce(function(a, b) {
				return this.join(a, b);
			}.bind(this));
			log("resolved symlink to " + result);
			request.path = result;
			callback();
		}.bind(this));
	});
};