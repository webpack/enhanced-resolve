/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import fs = require('graceful-fs')

class NodeJsInputFileSystem {
    readdir(path: string, callback: (err: Error, files: string[]) => void): void {
        fs.readdir(path, (err, files) => {
            callback(err, files && files.map(file => file.normalize ? file.normalize('NFC') : file))
        })
    }
}

interface NodeJsInputFileSystem {
    stat(path: string, callback?: (err: NodeJS.ErrnoException, stats: fs.Stats) => any): void;

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

    readlink(path: string, callback?: (err: NodeJS.ErrnoException, linkString: string) => any): void;
    statSync(path: string | Buffer): fs.Stats
    readdirSync(path: string): string[]
    readFileSync(filename: string, encoding: string): string;
    readFileSync(filename: string, options: { encoding: string; flag?: string; }): string;
    readFileSync(filename: string, options?: { flag?: string; }): Buffer;
    readlinkSync(path: string | Buffer): string
}

export = NodeJsInputFileSystem

NodeJsInputFileSystem.prototype.stat = fs.stat.bind(fs);
NodeJsInputFileSystem.prototype.readFile = fs.readFile.bind(fs);
NodeJsInputFileSystem.prototype.readlink = fs.readlink.bind(fs);
NodeJsInputFileSystem.prototype.statSync = fs.statSync.bind(fs);
NodeJsInputFileSystem.prototype.readdirSync = function readdirSync(path: string) {
    const files = fs.readdirSync(path);
    return files && files.map(function(file) {
            return file.normalize ? file.normalize('NFC') : file;
        });
};
NodeJsInputFileSystem.prototype.readFileSync = fs.readFileSync.bind(fs);
NodeJsInputFileSystem.prototype.readlinkSync = fs.readlinkSync.bind(fs);
