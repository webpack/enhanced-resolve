/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Storage, { IFSMethod } from './Storage'

class CachedInputFileSystem {
    _statStorage: Storage
    _readdirStorage: Storage
    _readFileStorage: Storage
    _readJsonStorage: Storage
    _readlinkStorage: Storage
    _stat: IFSMethod
    _readdir: IFSMethod
    _readFile: IFSMethod
    _readJson: IFSMethod
    _readlink: IFSMethod

    constructor(
        public fileSystem: {
            stat: IFSMethod
            readdir?: IFSMethod
            readFile?: (path: string, encoding?: string, callback?) => void
            readJson?: IFSMethod
            readlink?: IFSMethod
            isSync: () => boolean
        }, duration: number
    ) {
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
            this._readJson = (name, callback) => {
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

    stat(path: string, callback) {
        this._statStorage.provide(path, this._stat, callback)
    }

    readdir(path: string, callback) {
        this._readdirStorage.provide(path, this._readdir, callback)
    }

    readFile(path: string, callback) {
        this._readFileStorage.provide(path, this._readFile, callback)
    }

    readJson(path: string, callback) {
        this._readJsonStorage.provide(path, this._readJson, callback)
    }

    readlink(path: string, callback) {
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
