/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import fs = require('fs');
import { AbstractInputFileSystem } from './common-types'

class SyncAsyncFileSystemDecorator {
    fs: AbstractInputFileSystem
    readdir?(path: string, callback: (err: NodeJS.ErrnoException | null, files?: string[]) => void): void;
    readFile?(filename: string, callback: (err: NodeJS.ErrnoException | null, data?: Buffer) => void): void;
    readJson?(path: string, callback: (err: NodeJS.ErrnoException | null, data?: any) => void): void;
    readlink?(path: string, callback: (err: NodeJS.ErrnoException | null, linkString?: string) => void): void;
    stat?(path: string, callback: (err: NodeJS.ErrnoException | null, stats?: fs.Stats) => void): void;

    constructor(fs: AbstractInputFileSystem) {
        this.fs = fs;
        if (fs.statSync) {
            this.stat = function (arg: string, callback) {
                let result
                try {
                    result = fs.statSync(arg);
                } catch (e) {
                    return callback(e);
                }
                callback(null, result);
            };
        }
        if (fs.readdirSync) {
            this.readdir = function (arg: string, callback) {
                let result
                try {
                    result = fs.readdirSync(arg);
                } catch (e) {
                    return callback(e);
                }
                callback(null, result);
            };
        }
        if (fs.readFileSync) {
            this.readFile = function (arg: string, callback) {
                let result
                try {
                    result = fs.readFileSync(arg);
                } catch (e) {
                    return callback(e);
                }
                callback(null, result);
            };
        }
        if (fs.readlinkSync) {
            this.readlink = function (arg: string, callback) {
                let result
                try {
                    result = fs.readlinkSync(arg);
                } catch (e) {
                    return callback(e);
                }
                callback(null, result);
            };
        }
        if (fs.readJsonSync) {
            this.readJson = function (arg: string, callback) {
                let result
                try {
                    result = fs.readJsonSync(arg);
                } catch (e) {
                    return callback(e);
                }
                callback(null, result);
            };
        }
    }
}

export = SyncAsyncFileSystemDecorator;
