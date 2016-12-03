/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { LoggingCallbackWrapper, LoggingCallbackTools } from './common-types'

export = function createInnerCallback(
    callback: LoggingCallbackWrapper,
    options: LoggingCallbackTools,
    message?: string | null,
    messageOptional?: boolean
) {
    const log = options.log

    if (!log) {
        if (options.stack !== callback.stack) {
            const callbackWrapper: LoggingCallbackWrapper = function callbackWrapper() {
                return callback.apply(this, arguments)
            }
            callbackWrapper.stack = options.stack
            callbackWrapper.missing = options.missing
            return callbackWrapper
        }
        return callback
    }

    const theLog: string[] = []

    const loggingCallbackWrapper: LoggingCallbackWrapper = function loggingCallbackWrapper() {
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
