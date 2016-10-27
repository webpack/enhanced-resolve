/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import fs = require('graceful-fs')

class NodeJsInputFileSystem {
    readdir(path, callback) {
        fs.readdir(path, (err, files) => {
            callback(err, files && files.map(file => file.normalize ? file.normalize('NFC') : file))
        })
    }

    isSync() {
        return false
    }
}

export = NodeJsInputFileSystem

NodeJsInputFileSystem.prototype.stat = fs.stat.bind(fs);
NodeJsInputFileSystem.prototype.readFile = fs.readFile.bind(fs);
NodeJsInputFileSystem.prototype.readlink = fs.readlink.bind(fs)
