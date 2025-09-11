/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author adapted from tsconfig-paths-webpack-plugin
*/

"use strict";

const fs = require("fs");
const path = require("path");
const AliasPlugin = require("./AliasPlugin");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {{alias: string | string[] | false, name: string, onlyModule?: boolean}} AliasOption */

/**
 * @typedef {object} TsconfigPathsPluginOptions
 * @property {string=} configFile - Path to tsconfig.json file
 * @property {string=} baseUrl - Override baseUrl from tsconfig.json
 * @property {string=} context - Context directory for resolving relative paths
 */

module.exports = class TsconfigPathsPlugin {
	/**
	 * @param {string} source hook name to tap
	 * @param {string} configFile tsconfig file path
	 * @param {string} target next hook name
	 */
	constructor(source, configFile, target) {
		this.configFile = configFile;

		this.source = source;
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		// Load and convert tsconfig paths (including references) to AliasPlugin options
		const aliasOptions = this.loadAndConvertPaths();

		// Create and apply AliasPlugin with converted aliases
		const aliasPlugin = new AliasPlugin(this.source, aliasOptions, this.target);
		aliasPlugin.apply(resolver);
	}

	/**
	 * Load tsconfig.json (and referenced tsconfigs) and convert paths to AliasPlugin format
	 * @returns {AliasOption[]} Array of alias options for AliasPlugin
	 */
	loadAndConvertPaths() {
		try {
			const configPath = path.isAbsolute(this.configFile)
				? this.configFile
				: path.resolve(process.cwd(), this.configFile);

			const mainOptions = this.readTsconfigCompilerOptions(configPath);
			if (!mainOptions) return [];

			/** @type {AliasOption[]} */
			const aliases = [];
			aliases.push(
				...this.convertPathsToAliases(mainOptions.paths, mainOptions.baseUrl),
			);

			// Collect references from the main tsconfig.json
			const tsconfigJson = JSON.parse(fs.readFileSync(configPath, "utf8"));
			const references = Array.isArray(tsconfigJson.references)
				? tsconfigJson.references
				: [];

			for (const ref of references) {
				/** @type {string} */
				// TypeScript allows string or object with path
				const refPathLike = typeof ref === "string" ? ref : ref && ref.path;
				if (!refPathLike) continue;
				let refPath = path.isAbsolute(refPathLike)
					? refPathLike
					: path.resolve(path.dirname(configPath), refPathLike);
				// If reference points to a directory, append tsconfig.json
				try {
					const stat = fs.statSync(refPath);
					if (stat.isDirectory()) {
						refPath = path.join(refPath, "tsconfig.json");
					}
				} catch (_e) {
					// if it doesn't exist as directory/file, try adding tsconfig.json
					if (!/\.json$/i.test(refPath)) {
						refPath = path.join(refPath, "tsconfig.json");
					}
				}

				const refOptions = this.readTsconfigCompilerOptions(refPath);
				if (!refOptions) continue;
				aliases.push(
					...this.convertPathsToAliases(refOptions.paths, refOptions.baseUrl),
				);
			}

			return aliases;
		} catch (_error) {
			return [];
		}
	}

	/**
	 * Read tsconfig.json and return normalized compiler options
	 * @param {string} absTsconfigPath absolute path to tsconfig.json
	 * @returns {{ baseUrl: string, paths: {[key: string]: string[]} } | null} the normalized compiler options
	 */
	readTsconfigCompilerOptions(absTsconfigPath) {
		try {
			const json = JSON.parse(fs.readFileSync(absTsconfigPath, "utf8"));
			const compilerOptions =
				json && json.compilerOptions ? json.compilerOptions : {};
			let { baseUrl } = compilerOptions;
			if (!baseUrl) {
				baseUrl = path.dirname(absTsconfigPath);
			} else if (!path.isAbsolute(baseUrl)) {
				baseUrl = path.resolve(path.dirname(absTsconfigPath), baseUrl);
			}
			const paths = compilerOptions.paths || {};
			return { baseUrl, paths };
		} catch (_e) {
			return null;
		}
	}

	/**
	 * Convert TypeScript paths configuration to AliasPlugin aliases
	 * @param {{[key: string]: string[]}} paths TypeScript paths mapping
	 * @param {string} baseUrl Base URL for resolving paths
	 * @returns {AliasOption[]} Array of alias options
	 */
	convertPathsToAliases(paths, baseUrl) {
		/** @type {AliasOption[]} */
		const aliases = [];

		for (const [pattern, mappings] of Object.entries(paths)) {
			// Skip the catch-all pattern "*" as it would be too greedy for aliasing
			if (pattern === "*") continue;

			// Handle exact matches (no wildcards)
			if (!pattern.includes("*")) {
				if (mappings.length > 0) {
					const targetPath = path.resolve(baseUrl, mappings[0]);
					aliases.push({ name: pattern, alias: targetPath });
				}
			} else {
				// Handle wildcard patterns by mapping the directory
				const aliasName = pattern.replace(/\/\*$/, "");
				// Convert targets like "dir/*" -> "dir"
				const aliasTargets = mappings.map((mapping) =>
					path.resolve(baseUrl, mapping.replace(/\/\*$/, "")),
				);
				if (aliasTargets.length > 0) {
					aliases.push({ name: aliasName, alias: aliasTargets[0] });
				}
			}
		}

		return aliases;
	}
};
