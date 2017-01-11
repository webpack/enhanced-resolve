import { CommonFileSystemMethod } from './common-types'
import { Dictionary } from './concord'

class Storage {
    count: number
    data: Dictionary<any>
    interval: NodeJS.Timer | null
    levels: string[][]
    needTickCheck: boolean
    nextTick: number | null
    passive: boolean
    running: Dictionary<Function[]>

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

    finished(name: string, err: NodeJS.ErrnoException | null, result: any) {
        const callbacks = this.running[name];
        delete this.running[name];
        if (this.duration > 0) {
            this.count++;
            this.data[name] = [err, result];
            this.levels[0].push(name);
            this.ensureTick();
        }
        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i](err, result);
        }
    }

    finishedSync(name: string, err: NodeJS.ErrnoException | null, result?: any) {
        if (this.duration > 0) {
            this.count++;
            this.data[name] = [err, result];
            this.levels[0].push(name);
            this.ensureTick();
        }
    }

    provide(name: string, provider: CommonFileSystemMethod, callback: (...args: any[]) => any) {
        let running = this.running[name];
        if (running) {
            running.push(callback);
            return;
        }
        if (this.duration > 0) {
            this.checkTicks();
            const data = this.data[name];
            if (data) {
                return callback(...data);
            }
        }
        this.running[name] = running = [callback];
        provider(name, (err, result) => {
            this.finished(name, err, result);
        });
    }

    provideSync(name: string, provider: (name: string) => any) {
        if (this.duration > 0) {
            this.checkTicks();
            const data = this.data[name];
            if (data) {
                if (data[0]) {
                    throw data[0];
                }
                return data[1];
            }
        }
        let result
        try {
            result = provider(name);
        } catch (e) {
            this.finishedSync(null, e);
            throw e;
        }
        this.finishedSync(name, null, result);
        return result;
    }

    tick() {
        const decay = this.levels.pop() as string[]
        for (let i = decay.length - 1; i >= 0; i--) {
            delete this.data[decay[i]]
        }
        this.count -= decay.length
        decay.length = 0
        this.levels.unshift(decay)
        if (this.count === 0) {
            clearInterval(this.interval as NodeJS.Timer)
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
            clearInterval(this.interval as NodeJS.Timer)
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

    purge(what?: string | string[]) {
        if (!what) {
            this.count = 0
            clearInterval(this.interval as NodeJS.Timer)
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

export default Storage
