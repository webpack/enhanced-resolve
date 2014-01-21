/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function createLoggingCallback(callback, log, message) {
	if(!log) return callback;
	function loggingCallbackWrapper() {
		log(message);
		for(var i = 0; i < theLog.length; i++)
			log("  " + theLog[i]);
		callback.apply(this, arguments);
	}
	var theLog = [];
	loggingCallbackWrapper.log = function writeLog(msg) {
		theLog.push(msg);
	};
	return loggingCallbackWrapper;
}