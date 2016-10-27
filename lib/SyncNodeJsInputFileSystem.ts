/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import fs = require('graceful-fs')

type Callback = (something, result) => any

class SyncNodeJsInputFileSystem {
    isSync() { return true }
}

interface SyncNodeJsInputFileSystem {
    stat(cb: Callback, ...args): void

    readdir(cb: Callback, ...args): void

    readFile(cb: Callback, ...args): void

    readlink(cb: Callback, ...args): void
}

export = SyncNodeJsInputFileSystem

function asAsync(fn, context) {
    return function (...args) {
        const callback = args.pop()
        try {
            callback(null, fn.apply(context, args))
        } catch (e) {
            callback(e)
        }
    }
}

SyncNodeJsInputFileSystem.prototype.stat = asAsync(fs.statSync, fs);
SyncNodeJsInputFileSystem.prototype.readdir = asAsync(function readdirSync(path) {
    const files = fs.readdirSync(path)
    return files && files.map(file => file.normalize ? file.normalize('NFC') : file)
}, fs);
SyncNodeJsInputFileSystem.prototype.readFile = asAsync(fs.readFileSync, fs);
SyncNodeJsInputFileSystem.prototype.readlink = asAsync(fs.readlinkSync, fs)
