/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

class TryNextPlugin {
    constructor(source, message, target) {
        this.source = source
        this.message = message
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        const message = this.message
        resolver.plugin(this.source, (request, callback) => {
            resolver.doResolve(target, request, message, callback)
        })
    }
}

export = TryNextPlugin
