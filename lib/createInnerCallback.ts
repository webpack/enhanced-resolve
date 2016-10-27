/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
export = function createInnerCallback(callback, options, message, messageOptional) {
    const log = options.log

    if (!log) {
        if (options.stack !== callback.stack) {
            const callbackWrapper = function callbackWrapper() {
                return callback.apply(this, arguments)
            }
            callbackWrapper.stack = options.stack
            callbackWrapper.missing = options.missing
            return callbackWrapper
        }
        return callback
    }

    const theLog = []

    function loggingCallbackWrapper() {
        if (message) {
            if (!messageOptional || theLog.length > 0) {
                log(message)
                for (let i = 0; i < theLog.length; i++)
                    log(`  ${theLog[i]}`)
            }
        }
        else {
            for (let i = 0; i < theLog.length; i++)
                log(theLog[i])
        }
        return callback.apply(this, arguments);

    }

    loggingCallbackWrapper.log = function writeLog(msg) {
        theLog.push(msg)
    };
    loggingCallbackWrapper.stack = options.stack
    loggingCallbackWrapper.missing = options.missing

    return loggingCallbackWrapper
}
