/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

class NextPlugin {
    constructor(source, target) {
        this.source = source
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, (request, callback) => {
            resolver.doResolve(target, request, null, callback)
        })
    }
}

export = NextPlugin
