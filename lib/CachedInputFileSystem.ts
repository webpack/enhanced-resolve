/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Storage from './Storage'
import { ErrorCallback, CommonFileSystemMethod, AbstractInputFileSystem } from './common-types'
import fs = require('graceful-fs')

class CachedInputFileSystem {
    private _readdir: CommonFileSystemMethod
    private _readdirStorage: Storage
    private _readFile: CommonFileSystemMethod
    private _readFileStorage: Storage
    private _readJson: CommonFileSystemMethod
    private _readJsonStorage: Storage
    private _readlink: CommonFileSystemMethod
    private _readlinkStorage: Storage
    private _stat: CommonFileSystemMethod
    private _statStorage: Storage

    constructor(public fileSystem: AbstractInputFileSystem, duration: number) {
        this._statStorage = new Storage(duration)
        this._readdirStorage = new Storage(duration)
        this._readFileStorage = new Storage(duration)
        this._readJsonStorage = new Storage(duration)
        this._readlinkStorage = new Storage(duration)
        this._stat = this.fileSystem.stat.bind(this.fileSystem)
        this._readdir = this.fileSystem.readdir ? this.fileSystem.readdir.bind(this.fileSystem) : null
        this._readFile = this.fileSystem.readFile ? this.fileSystem.readFile.bind(this.fileSystem) : null
        if (this.fileSystem.readJson) {
            this._readJson = this.fileSystem.readJson.bind(this.fileSystem)
        }
        else {
            this._readJson = (name, callback: ErrorCallback<NodeJS.ErrnoException>) => {
                this.readFile(name, (err, buffer) => {
                    if (err) {
                        return callback(err)
                    }
                    let data
                    try {
                        data = JSON.parse(buffer.toString('utf-8'))
                    } catch (e) {
                        return callback(e)
                    }
                    callback(null, data)
                })
            }
        }
        this._readlink = this.fileSystem.readlink ? this.fileSystem.readlink.bind(this.fileSystem) : null
    }

    isSync() {
        return this.fileSystem.isSync()
    }

    stat(path: string, callback: (err: NodeJS.ErrnoException, stats: fs.Stats) => void) {
        this._statStorage.provide(path, this._stat, callback)
    }

    readdir(path: string, callback: (err: NodeJS.ErrnoException, files: string[]) => void) {
        this._readdirStorage.provide(path, this._readdir, callback)
    }

    readFile(path: string, callback: (err: NodeJS.ErrnoException, data: Buffer) => void) {
        this._readFileStorage.provide(path, this._readFile, callback)
    }

    readJson(path: string, callback: (err: NodeJS.ErrnoException, data: any) => void) {
        this._readJsonStorage.provide(path, this._readJson, callback)
    }

    readlink(path: string, callback: (err: NodeJS.ErrnoException, linkString: string) => void) {
        this._readlinkStorage.provide(path, this._readlink, callback)
    }

    purge(what?: string | string[]) {
        this._statStorage.purge(what)
        this._readdirStorage.purge(what)
        this._readFileStorage.purge(what)
        this._readlinkStorage.purge(what)
    }
}

export = CachedInputFileSystem
