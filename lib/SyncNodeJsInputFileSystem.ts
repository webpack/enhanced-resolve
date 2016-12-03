/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import fs = require('graceful-fs')
import { CommonFileSystemMethod } from './common-types'

class SyncNodeJsInputFileSystem {
    stat: CommonFileSystemMethod
    readdir: CommonFileSystemMethod
    readlink: CommonFileSystemMethod

    isSync() { return true }
}

interface SyncNodeJsInputFileSystem {
    readFile(filename: string, encoding: string, callback: (err: NodeJS.ErrnoException, data: string) => void): void;
    readFile(
        filename: string, options: { encoding: string; flag?: string; },
        callback: (err: NodeJS.ErrnoException, data: string) => void
    ): void;
    readFile(
        filename: string, options: { flag?: string; },
        callback: (err: NodeJS.ErrnoException, data: Buffer) => void
    ): void;
    readFile(filename: string, callback: (err: NodeJS.ErrnoException, data: Buffer) => void): void;
}

export = SyncNodeJsInputFileSystem

function asAsync(fn: Function, context: any) {
    return function (...args: any[]) {
        const callback = args.pop()
        try {
            callback(null, fn.apply(context, args))
        } catch (e) {
            callback(e)
        }
    }
}

SyncNodeJsInputFileSystem.prototype.stat = asAsync(fs.statSync, fs);
SyncNodeJsInputFileSystem.prototype.readdir = asAsync(function readdirSync(path: string) {
    const files = fs.readdirSync(path)
    return files && files.map(file => file.normalize ? file.normalize('NFC') : file)
}, fs);
SyncNodeJsInputFileSystem.prototype.readFile = asAsync(fs.readFileSync, fs);
SyncNodeJsInputFileSystem.prototype.readlink = asAsync(fs.readlinkSync, fs)
