/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class Storage {
    running: {}
    data: {}
    levels: string[][]
    count: number
    interval: NodeJS.Timer
    needTickCheck: boolean
    nextTick: number
    passive: boolean

    constructor(public duration: number) {
        this.running = {}
        this.data = {}
        this.levels = []
        if (duration > 0) {
            this.levels.push([], [], [], [], [], [], [], [], [])
            for (let i = 8000; i < duration; i += 500) this.levels.push([])
        }
        this.count = 0
        this.interval = null
        this.needTickCheck = false
        this.nextTick = null
        this.passive = true
        this.tick = this.tick.bind(this)
    }

    ensureTick() {
        if (!this.interval && this.duration > 0 && !this.nextTick) {
            this.interval = setInterval(this.tick, Math.floor(this.duration / this.levels.length))
        }
    }

    finished(name) {
        const args = Array.prototype.slice.call(arguments, 1)
        const callbacks = this.running[name]
        delete this.running[name]
        if (this.duration > 0) {
            this.count++
            this.data[name] = args
            this.levels[0].push(name)
            this.ensureTick()
        }
        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i].apply(null, args)
        }
    }

    provide(name, provider, callback) {
        let running = this.running[name]
        if (running) {
            running.push(callback)
            return
        }
        if (this.duration > 0) {
            this.checkTicks()
            const data = this.data[name]
            if (data) {
                return callback(...data)
            }
        }
        this.running[name] = running = [callback]
        provider(name, this.finished.bind(this, name))
    }

    tick() {
        const decay = this.levels.pop()
        for (let i = decay.length - 1; i >= 0; i--) {
            delete this.data[decay[i]]
        }
        this.count -= decay.length
        decay.length = 0
        this.levels.unshift(decay)
        if (this.count === 0) {
            clearInterval(this.interval)
            this.interval = null
            this.nextTick = null
            return true
        }
        else if (this.nextTick) {
            this.nextTick += Math.floor(this.duration / this.levels.length)
            const time = new Date().getTime()
            if (this.nextTick > time) {
                this.nextTick = null
                this.interval = setInterval(this.tick, Math.floor(this.duration / this.levels.length))
                return true
            }
        }
        else if (this.passive) {
            clearInterval(this.interval)
            this.interval = null
            this.nextTick = new Date().getTime() + Math.floor(this.duration / this.levels.length)
        }
        else {
            this.passive = true
        }
    }

    checkTicks() {
        this.passive = false
        if (this.nextTick) {
            while (!this.tick()) {}
        }
    }

    purge(what) {
        if (!what) {
            this.count = 0
            clearInterval(this.interval)
            this.nextTick = null
            this.data = {}
            this.levels.forEach(level => {
                level.length = 0
            })
        }
        else if (typeof what === 'string') {
            Object.keys(this.data).forEach(function (key) {
                if (key.indexOf(what) === 0) {
                    delete this.data[key]
                }
            }, this)
        }
        else {
            for (let i = what.length - 1; i >= 0; i--) {
                this.purge(what[i])
            }
        }
    }
}

class CachedInputFileSystem {
    fileSystem
    _statStorage: Storage
    _readdirStorage: Storage
    _readFileStorage: Storage
    _readJsonStorage: Storage
    _readlinkStorage: Storage
    _stat
    _readdir
    _readFile
    _readJson
    _readlink

    constructor(fileSystem, duration) {
        this.fileSystem = fileSystem
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

    stat(path, callback) {
        this._statStorage.provide(path, this._stat, callback)
    }

    readdir(path, callback) {
        this._readdirStorage.provide(path, this._readdir, callback)
    }

    readFile(path, callback) {
        this._readFileStorage.provide(path, this._readFile, callback)
    }

    readJson(path, callback) {
        this._readJsonStorage.provide(path, this._readJson, callback)
    }

    readlink(path, callback) {
        this._readlinkStorage.provide(path, this._readlink, callback)
    }

    purge(what) {
        this._statStorage.purge(what)
        this._readdirStorage.purge(what)
        this._readFileStorage.purge(what)
        this._readlinkStorage.purge(what)
    }
}

export = CachedInputFileSystem
