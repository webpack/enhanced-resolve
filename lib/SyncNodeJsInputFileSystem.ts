/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import fs = require('graceful-fs')
import { IFSMethod } from './Storage'

class SyncNodeJsInputFileSystem {
    isSync() { return true }

    stat: IFSMethod
    readdir: IFSMethod
    readFile: (path: string, encoding?: string, callback?: (err, result: Buffer) => void) => void
    readlink: IFSMethod
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
