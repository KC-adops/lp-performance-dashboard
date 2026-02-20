/**
 * Simple IndexedDB wrapper for caching API responses without size limits.
 * Includes timeouts to prevent blocking the UI.
 */
const DB_NAME = 'LPDashboardDB';
const STORE_NAME = 'api_cache';
const DB_VERSION = 1;
const DEFAULT_TIMEOUT = 3000; // 3 seconds

let dbPromise = null;

const getDB = () => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('IndexedDB connection timeout'));
            dbPromise = null; // Allow retry later
        }, DEFAULT_TIMEOUT);

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = (event) => {
                clearTimeout(timeoutId);
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                clearTimeout(timeoutId);
                reject(event.target.error || 'Unknown IndexedDB error');
                dbPromise = null;
            };

            request.onblocked = () => {
                console.warn('IndexedDB version change blocked');
            };
        } catch (e) {
            clearTimeout(timeoutId);
            reject(e);
            dbPromise = null;
        }
    });

    return dbPromise;
};

const withTimeout = (promise, ms = DEFAULT_TIMEOUT) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('IndexedDB operation timeout')), ms);
    });

    return Promise.race([
        promise,
        timeoutPromise
    ]).finally(() => clearTimeout(timeoutId));
};

export const setCache = async (key, val) => {
    try {
        const db = await getDB();
        return await withTimeout(new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(val, key);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        }));
    } catch (e) {
        console.warn('IndexedDB setCache failed:', e);
    }
};

export const getCache = async (key) => {
    try {
        const db = await getDB();
        return await withTimeout(new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (e) => reject(e.target.error);
        }));
    } catch (e) {
        console.warn('IndexedDB getCache failed:', e);
        return null;
    }
};

export const clearCache = async () => {
    try {
        const db = await getDB();
        return await withTimeout(new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        }));
    } catch (e) {
        console.warn('IndexedDB clearCache failed:', e);
    }
};

