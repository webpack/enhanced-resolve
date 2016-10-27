/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
export = function forEachBail(array: any, iterator: (val, cb) => void, callback) {
    if (array.length === 0) {
        return callback()
    }
    let currentPos = array.length
    let currentResult
    let done = []
    for (let i = 0; i < array.length; i++) {
        const itCb = createIteratorCallback(i)
        iterator(array[i], itCb)
        if (currentPos === 0) {
            break
        }
    }

    function createIteratorCallback(i) {
        return function (...args) {
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
