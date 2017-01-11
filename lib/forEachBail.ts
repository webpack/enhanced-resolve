/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { LoggingCallbackWrapper } from './common-types'

export = function forEachBail(
    array: any[],
    iterator: (val: any, cb: LoggingCallbackWrapper) => void,
    callback: (...args: any[]) => any
) {
    if (array.length === 0) {
        return callback()
    }
    let currentPos = array.length
    let currentResult: any[]
    let done = [] as number[]
    for (let i = 0; i < array.length; i++) {
        const itCb = createIteratorCallback(i)
        iterator(array[i], itCb)
        if (currentPos === 0) {
            break
        }
    }

    function createIteratorCallback(i: number) {
        return function (...args: any[]) {
            if (i >= currentPos) {
                return // ignore
            }
            done.push(i)
            if (args.length > 0) {
                currentPos = i + 1
                done = done.filter(item => item <= i)
                currentResult = args
            }
            if (done.length === currentPos) {
                callback(...currentResult)
                currentPos = 0
            }
        }
    }
}
