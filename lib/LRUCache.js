class LRUCache {
	/**
	 * @param {number} maxSize maxSize
	 */
	constructor(maxSize) {
		this._maxSize = maxSize;
		/** @type {string[]} */
		this._doublyQueue = [];
		this._cacheMap = new Map();
	}

	/**
	 * @param {string} item item
	 */
	get(item) {
		if (this._cacheMap.has(item)) {
			const itemData = this._doublyQueue.splice(
				this._doublyQueue.indexOf(item),
				1
			);
			this._doublyQueue.unshift(item);

			if (itemData.length > 0) {
				this._cacheMap.set(item, itemData[0]);
			}
		}
	}

	/**
	 * @param {any} item item
	 * @param {any} itemData itemData
	 */
	set(item, itemData) {
		if (this._doublyQueue.length === this._maxSize) {
			const last = this._doublyQueue[this._doublyQueue.length - 1];
			this._doublyQueue.pop();
			this._cacheMap.delete(last);
		}

		this._doublyQueue.unshift(item);
		this._cacheMap.set(item, itemData);
	}
}

module.exports = LRUCache;
