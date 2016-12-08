/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Storage from './Storage'
import { AbstractInputFileSystem, ErrorCallback } from './common-types'
import fs = require('graceful-fs')

class CachedInputFileSystem {
    private _readdir: (path: string, callback: (err: NodeJS.ErrnoException, files: string[]) => void) => void
    private _readdirStorage: Storage
    private _readFile: (path: string, callback: (err: NodeJS.ErrnoException, data: Buffer) => void) => void
    private _readFileStorage: Storage
    private _readJson: (path: string, callback: (err: NodeJS.ErrnoException, data: any) => void) => void
    private _readJsonStorage: Storage
    private _readlink: (path: string, callback: (err: NodeJS.ErrnoException, linkString: string) => void) => void
    private _readlinkStorage: Storage
    private _stat: (path: string, callback: (err: NodeJS.ErrnoException, stats: fs.Stats) => void) => void
    private _statStorage: Storage
    private _statSync: (path: string | Buffer) => fs.Stats
    private _readdirSync: (path: string) => string[]
    private _readFileSync: (filename: string, options?: { flag?: string; }) => Buffer;
    private _readlinkSync: (path: string | Buffer) => string
    private _readJsonSync: (path: string) => any

    constructor(public fileSystem: AbstractInputFileSystem, duration: number) {
        this._statStorage = new Storage(duration)
        this._readdirStorage = new Storage(duration)
        this._readFileStorage = new Storage(duration)
        this._readJsonStorage = new Storage(duration)
        this._readlinkStorage = new Storage(duration)

        this._stat = this.fileSystem.stat ? this.fileSystem.stat.bind(this.fileSystem) : null;
        if (!this._stat) {
            this.stat = undefined;
        }

        this._statSync = this.fileSystem.statSync ? this.fileSystem.statSync.bind(this.fileSystem) : null;
        if (!this._statSync) {
            this.statSync = undefined;
        }

        this._readdir = this.fileSystem.readdir ? this.fileSystem.readdir.bind(this.fileSystem) : null;
        if (!this._readdir) {
            this.readdir = undefined;
        }

        this._readdirSync = this.fileSystem.readdirSync ? this.fileSystem.readdirSync.bind(this.fileSystem) : null;
        if (!this._readdirSync) {
            this.readdirSync = undefined;
        }

        this._readFile = this.fileSystem.readFile ? this.fileSystem.readFile.bind(this.fileSystem) : null;
        if (!this._readFile) {
            this.readFile = undefined;
        }

        this._readFileSync = this.fileSystem.readFileSync ? this.fileSystem.readFileSync.bind(this.fileSystem) : null;
        if (!this._readFileSync) {
            this.readFileSync = undefined;
        }

        if (this.fileSystem.readJson) {
            this._readJson = this.fileSystem.readJson.bind(this.fileSystem);
        }
        else if (this.readFile) {
            this._readJson = (path: string, callback: ErrorCallback<NodeJS.ErrnoException>) => {
                this.readFile(path, (err, buffer) => {
                    if (err) {
                        return callback(err)
                    }
                    let data: string
                    try {
                        data = JSON.parse(buffer.toString('utf-8'))
                    } catch (e) {
                        return callback(e)
                    }
                    callback(null, data)
                });
            };
        }
        else {
            this.readJson = undefined;
        }
        if (this.fileSystem.readJsonSync) {
            this._readJsonSync = this.fileSystem.readJsonSync.bind(this.fileSystem);
        }
        else if (this.readFileSync) {
            this._readJsonSync = function (path: string) {
                const buffer = this.readFileSync(path);
                let data: string
                try {
                    data = JSON.parse(buffer.toString('utf-8'))
                } catch (e) {
                    return null
                }
                return data
            }.bind(this);
        }
        else {
            this.readJsonSync = undefined;
        }

        this._readlink = this.fileSystem.readlink ? this.fileSystem.readlink.bind(this.fileSystem) : null;
        if (!this._readlink) {
            this.readlink = undefined;
        }

        this._readlinkSync = this.fileSystem.readlinkSync ? this.fileSystem.readlinkSync.bind(this.fileSystem) : null;
        if (!this._readlinkSync) {
            this.readlinkSync = undefined;
        }
    }

    stat?(path: string, callback: (err: NodeJS.ErrnoException, stats: fs.Stats) => void) {
        this._statStorage.provide(path, this._stat, callback)
    }

    readdir?(path: string, callback: (err: NodeJS.ErrnoException, files: string[]) => void) {
        this._readdirStorage.provide(path, this._readdir, callback)
    }

    readFile?(path: string, callback: (err: NodeJS.ErrnoException, data: Buffer) => void) {
        this._readFileStorage.provide(path, this._readFile, callback)
    }

    readJson?(path: string, callback: (err: NodeJS.ErrnoException, data: any) => void) {
        this._readJsonStorage.provide(path, this._readJson, callback)
    }

    readlink?(path: string, callback: (err: NodeJS.ErrnoException, linkString: string) => void) {
        this._readlinkStorage.provide(path, this._readlink, callback)
    }

    statSync?(path: string) {
        return this._statStorage.provideSync(path, this._statSync);
    }

    readdirSync?(path: string) {
        return this._readdirStorage.provideSync(path, this._readdirSync);
    }

    readFileSync?(path: string) {
        return this._readFileStorage.provideSync(path, this._readFileSync);
    }

    readJsonSync?(path: string) {
        return this._readJsonStorage.provideSync(path, this._readJsonSync);
    }

    readlinkSync?(path: string) {
        return this._readlinkStorage.provideSync(path, this._readlinkSync);
    }

    purge(what?: string | string[]) {
        this._statStorage.purge(what)
        this._readdirStorage.purge(what)
        this._readFileStorage.purge(what)
        this._readlinkStorage.purge(what)
        this._readJsonStorage.purge(what)
    }
}

export = CachedInputFileSystem
