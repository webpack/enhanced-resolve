/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author jhonsnow456
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveContext} ResolveContext */

/**
 * @typedef {object} ProfileHookEntry
 * @property {string} name hook name
 * @property {number} count number of times this hook was entered
 * @property {number} totalTime total wall-clock time in milliseconds
 */

/**
 * @typedef {object} ProfileData
 * @property {number} startTime when the resolve started (Date.now() epoch)
 * @property {number} endTime when the resolve completed
 * @property {number} duration total duration in milliseconds
 * @property {string} specifier the request string that was resolved
 * @property {string} parent the parent path resolution started from
 * @property {boolean} success whether the resolution succeeded
 * @property {string | null} result the resolved path, or null on failure
 * @property {Map<string, ProfileHookEntry>} hooks per-hook profiling data
 */

const now = () => Date.now();

module.exports = class ProfilerPlugin {
	/**
	 * @param {(profile: ProfileData) => void=} profileCallback optional callback
	 */
	constructor(profileCallback) {
		this.profileCallback = profileCallback;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const { profileCallback } = this;
		const { hooks } = resolver;
		const resolveStepHook = hooks.resolveStep;
		const resultHook = hooks.result;
		const noResolveHook = hooks.noResolve;

		/** @type {{ name: string, lastEventTime: number }[]} */
		const frameStack = [];

		/** @type {Map<string, ProfileHookEntry>} */
		let hookStats = new Map();

		/** @type {ProfileData | null} */
		let currentProfile = null;

		/**
		 * Pop all remaining frames and attribute remaining time.
		 * @param {number} endTime end timestamp
		 */
		function finalizeFrames(endTime) {
			while (frameStack.length > 0) {
				const frameEntry = frameStack.pop();
				if (!frameEntry) break;
				const elapsed = endTime - frameEntry.lastEventTime;
				const stats = hookStats.get(frameEntry.name);
				if (stats) {
					stats.totalTime += elapsed;
				}
			}
		}

		/**
		 * Deliver profile data to the caller.
		 * @param {ResolveContext} resolveContext resolve context
		 * @param {ProfileData} profile profile data to deliver
		 */
		function emitProfile(resolveContext, profile) {
			const callback =
				typeof resolveContext.profile === "function"
					? resolveContext.profile
					: profileCallback;
			if (typeof callback === "function") {
				callback(profile);
			}
			if (resolveContext.log) {
				resolveContext.log(
					`profile: resolved "${profile.specifier}" in ${profile.duration.toFixed(2)}ms`,
				);
				for (const hookStatsEntry of profile.hooks.values()) {
					resolveContext.log(
						`  ${hookStatsEntry.name}: ${hookStatsEntry.count}x, ${hookStatsEntry.totalTime.toFixed(2)}ms`,
					);
				}
			}
		}

		resolveStepHook.tap("ProfilerPlugin", (hook, request) => {
			const time = now();
			const name = typeof hook === "string" ? hook : hook.name || "unknown";

			if (frameStack.length === 0) {
				currentProfile = {
					startTime: time,
					endTime: 0,
					duration: 0,
					specifier: request.request || "",
					parent: request.path || "",
					success: false,
					result: null,
					hooks: hookStats,
				};
			}

			if (frameStack.length > 0) {
				const parent = frameStack[frameStack.length - 1];
				const elapsed = time - parent.lastEventTime;
				const parentStats = hookStats.get(parent.name);
				if (parentStats) {
					parentStats.totalTime += elapsed;
				}
			}

			let stats = hookStats.get(name);
			if (!stats) {
				stats = { name, count: 0, totalTime: 0 };
				hookStats.set(name, stats);
			}
			stats.count++;

			frameStack.push({ name, lastEventTime: time });
		});

		/**
		 * Finalize profiling when resolution completes successfully.
		 */
		resultHook.tapAsync("ProfilerPlugin", (request, ctx, callback) => {
			if (currentProfile) {
				const time = now();
				currentProfile.endTime = time;
				currentProfile.duration = time - currentProfile.startTime;
				currentProfile.success = true;
				currentProfile.result = request.path || null;

				finalizeFrames(time);
				emitProfile(ctx, currentProfile);
				currentProfile = null;
				hookStats = new Map();
			}
			callback(null);
		});

		/**
		 * Finalize profiling when resolution fails.
		 */
		noResolveHook.tap("ProfilerPlugin", (_request, _error) => {
			if (currentProfile) {
				const time = now();
				currentProfile.endTime = time;
				currentProfile.duration = time - currentProfile.startTime;
				currentProfile.success = false;
				currentProfile.result = null;

				finalizeFrames(time);
				if (typeof profileCallback === "function") {
					profileCallback(currentProfile);
				}
				currentProfile = null;
				hookStats = new Map();
			}
		});
	}
};
