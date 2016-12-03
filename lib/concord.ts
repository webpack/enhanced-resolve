/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { globToRegExp } from './globToRegExp'

export interface Dictionary<T> {
    [key: string]: T
}

// see https://github.com/webpack/concord
export interface Concord {
    '[server] main': string
    extensions: string[]
    main: string
    modules: Dictionary<string>
    types: Dictionary<string>
}

export interface Type {
    type: string | null | undefined
    features: string[]
}

export interface ConcordContext {
    environments?: string[]
    referrer?: string
    supportedResourceTypes?: string[]
}

function parseType(type: string): Type {
    const items = type.split('+')
    const t = items.shift()
    return {
        type: t === '*' ? null : t,
        features: items
    }
}

function isTypeMatched(baseType: string | Type, testedType: string | Type) {
    if (typeof baseType === 'string') {
        baseType = parseType(baseType)
    }
    if (typeof testedType === 'string') {
        testedType = parseType(testedType)
    }
    if (testedType.type && testedType.type !== baseType.type) {
        return false
    }
    return testedType.features.every(requiredFeature => (<Type>baseType).features.includes(requiredFeature))
}

function isResourceTypeMatched(rawBaseType: string, rawTestedType: string) {
    const baseType = rawBaseType.split('/')
    const testedType = rawTestedType.split('/')
    if (baseType.length !== testedType.length) {
        return false
    }
    for (let i = 0; i < baseType.length; i++) {
        if (!isTypeMatched(baseType[i], testedType[i])) {
            return false
        }
    }
    return true
}

function isResourceTypeSupported(context: ConcordContext, type: string): boolean {
    return !!context.supportedResourceTypes
        && context.supportedResourceTypes.some(supportedType => isResourceTypeMatched(supportedType, type))
}

function isEnvironment(context: ConcordContext, env: string | Type): boolean {
    return !!context.environments && context.environments.every(environment => isTypeMatched(environment, env))
}

const globCache: Dictionary<RegExp> = {}

function getGlobRegExp(glob: string) {
    return globCache[glob] || (globCache[glob] = globToRegExp(glob))
}

function matchGlob(glob: string, relativePath: string) {
    const regExp = getGlobRegExp(glob)
    return regExp.exec(relativePath)
}

function isGlobMatched(glob: string, relativePath: string) {
    return !!matchGlob(glob, relativePath)
}

function isConditionMatched(context: ConcordContext, condition: string) {
    const items = condition.split('|')
    return items.some(function testFn(item): boolean {
        item = item.trim()
        const inverted = /^!/.test(item)
        if (inverted) {
            return !testFn(item.substr(1))
        }
        if (/^[a-z]+:/.test(item)) {
            // match named condition
            const match = <RegExpExecArray>(/^([a-z]+):\s*/.exec(item))
            const value = item.substr(match[0].length)
            const name = match[1]
            switch (name) {
                case 'referrer':
                    return isGlobMatched(value, context.referrer)
                default:
                    return false
            }
        }
        else if (item.includes('/')) {
            // match supported type
            return isResourceTypeSupported(context, item)
        }
        else {
            // match environment
            return isEnvironment(context, item)
        }
    })
}

function isKeyMatched(context: ConcordContext, key: string): string | boolean {
    while (true) {
        const match = /^\[([^\]]+)\]\s*/.exec(key)
        if (!match) {
            return key
        }
        key = key.substr(match[0].length)
        const condition = match[1]
        if (!isConditionMatched(context, condition)) {
            return false
        }
    }
}

function getField(context: ConcordContext, configuration: Concord, field: string): any {
    let value
    Object.keys(configuration)
        .forEach(key => {
            const pureKey = isKeyMatched(context, key)
            if (pureKey === field) {
                value = configuration[key]
            }
        })
    return value
}

function getMain(context: ConcordContext, configuration: Concord) {
    return getField(context, configuration, 'main')
}

function getExtensions(context: ConcordContext, configuration: Concord) {
    return getField(context, configuration, 'extensions')
}

function matchModule(context: ConcordContext, configuration: Concord, request: string) {
    const modulesField = getField(context, configuration, 'modules')
    if (!modulesField) {
        return request
    }
    let newRequest = request
    const keys = Object.keys(modulesField)
    let iteration = 0
    let index: number
    let match: RegExpExecArray
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const pureKey = <string>isKeyMatched(context, key)
        match = matchGlob(pureKey, newRequest) as RegExpExecArray
        if (match) {
            const value = modulesField[key]
            if (typeof value !== 'string') {
                return value
            }
            else if (/^\(.+\)$/.test(pureKey)) {
                newRequest = newRequest.replace(getGlobRegExp(pureKey), value)
            }
            else {
                index = 1
                newRequest = value.replace(/(\/?\*)?\*/g, replaceMatcher)
            }
            i = -1
            if (iteration++ > keys.length) {
                throw new Error(`Request '${request}' matches recursively`)
            }
        }
    }
    return newRequest

    function replaceMatcher(find: string) {
        switch (find) {
            case '/**':
                const m = match[index++]
                return m ? `/${m}` : ''
            case '**':
            case '*':
                return match[index++]
        }

        // todo: throw error or return empty string
    }
}

function matchType(context: ConcordContext, configuration: Concord, relativePath: string) {
    const typesField = getField(context, configuration, 'types')
    if (!typesField) {
        return undefined
    }

    let type: string | undefined
    Object.keys(typesField).forEach(key => {
        const pureKey = <string>isKeyMatched(context, key)
        if (isGlobMatched(pureKey, relativePath)) {
            const value = (<any>typesField)[key]
            if (!type && /\/\*$/.test(value)) {
                throw new Error(`value ('${value}') of key '${key}' contains '*', but there is no previous value defined`)
            }
            type = value.replace(/\/\*$/, `/${type}`)
        }
    })
    return type
}

export {
    parseType,
    isTypeMatched,
    isResourceTypeSupported,
    isEnvironment,
    isGlobMatched,
    isConditionMatched,
    isKeyMatched,
    getField,
    getMain,
    getExtensions,
    matchModule,
    matchType
}
