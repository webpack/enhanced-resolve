/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function createInnerCallback(callback, options, message, messageOptional) {
	var log = options.log;
	if(!log) {
		if(options.stack !== callback.stack) {
			var callbackWrapper = function callbackWrapper() {
				return callback.apply(this, arguments);
			};
			callbackWrapper.stack = options.stack;
			callbackWrapper.missing = options.missing;
			return callbackWrapper;
		}
		return callback;
	}

	function loggingCallbackWrapper() {
		return callback.apply(this, arguments);

	}
	if(message) {
		if(!messageOptional) {
			log(message);
		}
		loggingCallbackWrapper.log = function writeLog(msg) {
			if(messageOptional) {
				log(message);
				messageOptional = false;
			}
			log("  " + msg);
		};
	} else {
		loggingCallbackWrapper.log = function writeLog(msg) {
			log(msg);
		};
	}
	loggingCallbackWrapper.stack = options.stack;
	loggingCallbackWrapper.missing = options.missing;
	return loggingCallbackWrapper;
};
