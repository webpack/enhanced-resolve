/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path')

import concord = require('./concord')
import DescriptionFileUtils = require('./DescriptionFileUtils')

class ConcordMainPlugin {
    constructor(public source: string, public options: {}, public target: string) {
    }

    apply(resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
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
            const obj = Object.assign({}, request, {
                request: mainModule
            })
            const filename = path.basename(request.descriptionFilePath)
            return resolver.doResolve(target, obj, `use ${mainModule} from ${filename}`, callback)
        })
    }
}

export = ConcordMainPlugin
