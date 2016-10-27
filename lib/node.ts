/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import assign = require('object-assign')

// Export Resolver, FileSystems and Plugins
import ResolverFactory = require('./ResolverFactory')
import NodeJsInputFileSystem = require('./NodeJsInputFileSystem')
import SyncNodeJsInputFileSystem = require('./SyncNodeJsInputFileSystem')
import CachedInputFileSystem = require('./CachedInputFileSystem')

const asyncFileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 4000)
const syncFileSystem = new CachedInputFileSystem(new SyncNodeJsInputFileSystem(), 4000)

const nodeContext = {
    environments: ['node+es3+es5+process+native']
}

const asyncResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    fileSystem: asyncFileSystem
})

function resolve(context, path, request, callback) {
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
resolve.sync = function resolveSync(context, path, request) {
    if (typeof context === 'string') {
        request = path
        path = context
        context = nodeContext
    }
    return syncResolver.resolveSync(context, path, request)
}

const asyncContextResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    resolveToContext: true,
    fileSystem: asyncFileSystem
});
resolve.context = function resolveContext(context, path, request, callback) {
    if (typeof context === 'string') {
        callback = request
        request = path
        path = context
        context = nodeContext
    }
    asyncContextResolver.resolve(context, path, request, callback)
}

const syncContextResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    resolveToContext: true,
    fileSystem: syncFileSystem
});
resolve.context.sync = function resolveContextSync(context, path, request) {
    if (typeof context === 'string') {
        request = path
        path = context
        context = nodeContext
    }
    return syncContextResolver.resolveSync(context, path, request)
}

const asyncLoaderResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    moduleExtensions: ['-loader'],
    mainFields: ['loader', 'main'],
    fileSystem: asyncFileSystem
});
resolve.loader = function resolveLoader(context, path, request, callback) {
    if (typeof context === 'string') {
        callback = request
        request = path
        path = context
        context = nodeContext
    }
    asyncLoaderResolver.resolve(context, path, request, callback)
}

const syncLoaderResolver = ResolverFactory.createResolver({
    extensions: ['.js', '.json', '.node'],
    moduleExtensions: ['-loader'],
    mainFields: ['loader', 'main'],
    fileSystem: syncFileSystem
});
resolve.loader.sync = function resolveLoaderSync(context, path, request) {
    if (typeof context === 'string') {
        request = path
        path = context
        context = nodeContext
    }
    return syncLoaderResolver.resolveSync(context, path, request)
}

resolve.create = function create(options) {
    options = assign({
        fileSystem: asyncFileSystem
    }, options)
    const resolver = ResolverFactory.createResolver(options)
    return (context, path, request, callback) => {
        if (typeof context === 'string') {
            callback = request
            request = path
            path = context
            context = nodeContext
        }
        resolver.resolve(context, path, request, callback)
    }
}

resolve.create.sync = function createSync(options) {
    options = assign({
        fileSystem: syncFileSystem
    }, options)
    const resolver = ResolverFactory.createResolver(options)
    return (context, path, request) => {
        if (typeof context === 'string') {
            request = path
            path = context
            context = nodeContext
        }
        return resolver.resolveSync(context, path, request)
    }
}

resolve.ResolverFactory = ResolverFactory
resolve.NodeJsInputFileSystem = NodeJsInputFileSystem
resolve.SyncNodeJsInputFileSystem = SyncNodeJsInputFileSystem
resolve.CachedInputFileSystem = CachedInputFileSystem
