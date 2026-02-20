/**
 * Simple IndexedDB wrapper for caching API responses without size limits.
 */
const DB_NAME = 'LPDashboardDB';
const STORE_NAME = 'api_cache';
const DB_VERSION = 1;

let dbPromise = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    return dbPromise;
};

export const setCache = async (key, val) => {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(val, key);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (e) {
        console.warn('IndexedDB setCache failed:', e);
    }
};

export const getCache = async (key) => {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (e) {
        console.warn('IndexedDB getCache failed:', e);
        return null;
    }
};

export const clearCache = async () => {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (e) {
        console.warn('IndexedDB clearCache failed:', e);
    }
};
