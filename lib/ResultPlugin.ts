/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

class ResultPlugin {
    constructor(source) {
        this.source = source
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, (request, callback) => {
            const obj = assign({}, request)
            resolver.applyPluginsAsync('result', obj, err => {
                if (err) {
                    return callback(err)
                }
                callback(null, obj)
            })
        })
    }
}

export = ResultPlugin
