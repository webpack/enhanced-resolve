"use strict";

// Preloaded through `NODE_OPTIONS=--require` in the Deno leg of the
// cross-runtime CI job, which puts it in the main process and in every jest
// worker (they inherit `NODE_OPTIONS`).
//
// jest clears mocks by walking the globals of the test sandbox and testing
// `"_isMockFunction" in value` on each one (`ModuleMocker.clearMocksOnScope`).
// Its node environment exposes `localStorage` there, and in Deno that global is
// backed by a SQLite database under `DENO_DIR` which is opened on first access.
// Jest workers are separate Deno processes, so on a cold cache they all race to
// create that database and the losers throw "database is locked", failing a
// random test suite.
//
// An in-memory `Storage` keeps the globals (and jest's `in` check) working
// without ever opening the database. Neither the library nor the suite uses web
// storage, so nothing needs to persist.

/** In-memory stand-in for the web `Storage` interface. */
class MemoryStorage {
	constructor() {
		/** @type {Map<string, string>} */
		this._items = new Map();
	}

	/** @returns {number} number of stored items */
	get length() {
		return this._items.size;
	}

	/**
	 * @param {number} index position of the key
	 * @returns {string | null} the key at `index`, or `null` when out of range
	 */
	key(index) {
		const keys = [...this._items.keys()];

		return index < keys.length ? keys[index] : null;
	}

	/**
	 * @param {string} key item key
	 * @returns {string | null} the stored value, or `null` when not set
	 */
	getItem(key) {
		const item = this._items.get(String(key));

		return item === undefined ? null : item;
	}

	/**
	 * @param {string} key item key
	 * @param {string} value item value
	 * @returns {void}
	 */
	setItem(key, value) {
		this._items.set(String(key), String(value));
	}

	/**
	 * @param {string} key item key
	 * @returns {void}
	 */
	removeItem(key) {
		this._items.delete(String(key));
	}

	/** @returns {void} */
	clear() {
		this._items.clear();
	}
}

if (typeof Deno !== "undefined") {
	for (const name of ["localStorage", "sessionStorage"]) {
		Object.defineProperty(global, name, {
			configurable: true,
			enumerable: true,
			writable: true,
			value: new MemoryStorage(),
		});
	}
}
