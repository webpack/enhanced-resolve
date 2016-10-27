/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path')

import assign = require('object-assign')
import concord = require('./concord')
import DescriptionFileUtils = require('./DescriptionFileUtils')

class ConcordMainPlugin {
    constructor(source, options, target) {
        this.source = source
        this.options = options
        this.target = target
    }

    apply(resolver) {
        const target = this.target
        const options = this.options
        resolver.plugin(this.source, (request, callback) => {
            if (request.path !== request.descriptionFileRoot) {
                return callback()
            }
            const concordField = DescriptionFileUtils.getField(request.descriptionFileData, 'concord')
            if (!concordField) {
                return callback()
            }
            const mainModule = concord.getMain(request.context, concordField)
            if (!mainModule) {
                return callback()
            }
            const obj = assign({}, request, {
                request: mainModule
            })
            const filename = path.basename(request.descriptionFilePath)
            return resolver.doResolve(target, obj, `use ${mainModule} from ${filename}`, callback)
        })
    }
}

export = ConcordMainPlugin
