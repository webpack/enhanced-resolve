/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

import createInnerCallback = require('./createInnerCallback')

class ModulesInRootPlugin {
    constructor(source, path, target) {
        this.source = source
        this.path = path
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        const path = this.path
        resolver.plugin(this.source, (request, callback) => {
            const obj = assign({}, request, {
                path,
                request: `./${request.request}`
            })
            resolver.doResolve(target, obj, `looking for modules in ${path}`, callback, true)
        })
    }
}

export = ModulesInRootPlugin
