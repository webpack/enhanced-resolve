/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
// Export Resolver, FileSystems and Plugins
import ResolverFactory = require('./ResolverFactory')
import NodeJsInputFileSystem = require('./NodeJsInputFileSystem')
import SyncNodeJsInputFileSystem = require('./SyncNodeJsInputFileSystem')
import CachedInputFileSystem = require('./CachedInputFileSystem')
import { LoggingCallbackWrapper, ResolveResult, ResolveContext } from './common-types'
import { ResolverOption } from './ResolverFactory'

const asyncFileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 4000)
const syncFileSystem = new CachedInputFileSystem(new SyncNodeJsInputFileSystem(), 4000)

const nodeContext = {
    environments: ['node+es3+es5+process+native']
}

const asyncResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    fileSystem: asyncFileSystem
})

function resolve(path: string, request: string, callback: LoggingCallbackWrapper): void
function resolve(context: ResolveContext, path: string, request: string, callback: LoggingCallbackWrapper): void

function resolve(context: any, path: any, request: any, callback?: any) {
    if (typeof context === 'string') {
        callback = request
        request = path
        path = context
        context = nodeContext
    }
    asyncResolver.resolve(context, path, request, callback)
}

export = resolve

const syncResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    fileSystem: syncFileSystem
});

function resolveSync(path: string, request: string): ResolveResult
function resolveSync(context: ResolveContext, path: string, request: string): ResolveResult

function resolveSync(context: any, path: any, request?: any): ResolveResult {
    if (typeof context === 'string') {
        request = path
        path = context
        context = nodeContext
    }
    return syncResolver.resolveSync(context, path, request)
}

resolve.sync = resolveSync

const asyncContextResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    resolveToContext: true,
    fileSystem: asyncFileSystem
});

function resolveContext(path: string, request: string, callback: LoggingCallbackWrapper): void
function resolveContext(context: ResolveContext, path: string, request: string, callback: LoggingCallbackWrapper): void

function resolveContext(context: any, path: any, request: any, callback?: any) {
    if (typeof context === 'string') {
        callback = request
        request = path
        path = context
        context = nodeContext
    }
    asyncContextResolver.resolve(context, path, request, callback)
}

resolve.context = resolveContext

const syncContextResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    resolveToContext: true,
    fileSystem: syncFileSystem
});

function resolveContextSync(context: ResolveContext, path: string, request: string): ResolveResult
function resolveContextSync(path: string, request: string): ResolveResult

function resolveContextSync(context: any, path: any, request?: any): ResolveResult {
    if (typeof context === 'string') {
        request = path
        path = context
        context = nodeContext
    }
    return syncContextResolver.resolveSync(context, path, request)
}

resolve.context.sync = resolveContextSync

const asyncLoaderResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    moduleExtensions: ['-loader'],
    mainFields: ['loader', 'main'],
    fileSystem: asyncFileSystem
});

function resolveLoader(path: string, request: string, callback: LoggingCallbackWrapper): void
function resolveLoader(context: ResolveContext, path: string, request: string, callback: LoggingCallbackWrapper): void

function resolveLoader(context: any, path: any, request: any, callback?: any) {
    if (typeof context === 'string') {
        callback = request
        request = path
        path = context
        context = nodeContext
    }
    asyncLoaderResolver.resolve(context, path, request, callback)
}

resolve.loader = resolveLoader

const syncLoaderResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    moduleExtensions: ['-loader'],
    mainFields: ['loader', 'main'],
    fileSystem: syncFileSystem
});

function resolveLoaderSync(path: string, request: string): ResolveResult
function resolveLoaderSync(context: ResolveContext, path: string, request: string): ResolveResult

function resolveLoaderSync(context: any, path: any, request?: any) {
    if (typeof context === 'string') {
        request = path
        path = context
        context = nodeContext
    }
    return syncLoaderResolver.resolveSync(context, path, request)
}

resolve.loader.sync = resolveLoaderSync

function create(options: ResolverOption) {
    options = Object.assign({
        fileSystem: asyncFileSystem
    }, options)
    const resolver = ResolverFactory.createResolver(options)

    return (context: any, path: any, request: any, callback: any) => {
        if (typeof context === 'string') {
            callback = request
            request = path
            path = context
            context = nodeContext
        }
        resolver.resolve(context, path, request, callback)
    }
}

resolve.create = create

function createSync(options: ResolverOption) {
    options = Object.assign({
        fileSystem: syncFileSystem
    }, options)
    const resolver = ResolverFactory.createResolver(options)
    return (context: any, path: any, request: any) => {
        if (typeof context === 'string') {
            request = path
            path = context
            context = nodeContext
        }
        return resolver.resolveSync(context, path, request)
    }
}

resolve.create.sync = createSync

resolve.ResolverFactory = ResolverFactory
resolve.NodeJsInputFileSystem = NodeJsInputFileSystem
resolve.SyncNodeJsInputFileSystem = SyncNodeJsInputFileSystem
resolve.CachedInputFileSystem = CachedInputFileSystem
