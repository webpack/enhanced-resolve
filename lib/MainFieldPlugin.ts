/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path')
import Resolver = require('./Resolver')
import { LoggingCallbackWrapper, ResolverRequest } from './common-types'

class MainFieldPlugin {
    constructor(
        public source: string,
        public options: {
            name: string
            forceRelative: boolean
        },
        public target: string
    ) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        const options = this.options
        resolver.plugin(this.source, function mainField(request: ResolverRequest, callback: LoggingCallbackWrapper) {
            if (request.path !== request.descriptionFileRoot) {
                return callback()
            }
            const content = request.descriptionFileData
            const filename = path.basename(request.descriptionFilePath as string)
            let mainModule
            const field = options.name
            if (Array.isArray(field)) {
                let current = content
                for (let j = 0; j < field.length; j++) {
                    if (current === null || typeof current !== 'object') {
                        current = null
                        break
                    }
                    current = current[field[j]]
                }
                if (typeof current === 'string') {
                    mainModule = current
                }
            }
            else {
                if (typeof content[field] === 'string') {
                    mainModule = content[field]
                }
            }
            if (!mainModule) {
                return callback()
            }
            if (options.forceRelative && !/^\.\.?\//.test(mainModule)) {
                mainModule = `./${mainModule}`
            }
            const obj = Object.assign({}, request, {
                request: mainModule
            })
            return resolver.doResolve(target, obj, `use ${mainModule} from ${options.name} in ${filename}`, callback)
        })
    }
}

export = MainFieldPlugin
