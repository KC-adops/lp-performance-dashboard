/**
 * Google Sheets API Client
 * Handles fetching data from Google Sheets using the Sheets API v4
 */
import { getCache, setCache } from '../utils/indexedDB';

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;
const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Fetch data from a specific sheet tab
 * @param {string} sheetName - Name of the sheet tab (e.g., 'AFAD_LP_Summary_Report')
 * @param {string} range - Optional range (e.g., 'A1:Z1000'). If not provided, fetches entire sheet.
 * @param {boolean} forceRefresh - Bypass cache and fetch from network
 * @param {boolean} cacheOnly - Only return cache, don't fetch from network
 * @returns {Promise<Array>} - 2D array of cell values
 */
export const fetchSheetData = async (sheetName, range = '', spreadsheetId = SPREADSHEET_ID, forceRefresh = false, cacheOnly = false) => {
    if (!API_KEY || API_KEY === 'your_api_key_here') {
        console.warn('Google Sheets API key not configured. Using mock data.');
        return null;
    }

    const cacheKey = `idb_cache_${spreadsheetId}_${sheetName}_${range}`;
    const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours limit on the hard cache, but we rely on forceRefresh for SWR

    if (!forceRefresh) {
        try {
            const cachedStr = await getCache(cacheKey);
            if (cachedStr) {
                const parsed = JSON.parse(cachedStr);
                if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
                    console.log(`Using IndexedDB cached data for ${sheetName}`);
                    return parsed.values;
                }
            }
        } catch (e) {
            console.warn(`Cache skip for ${sheetName} due to error:`, e);
        }
    }

    if (cacheOnly) return null;

    try {
        const fullRange = range ? `${sheetName}!${range}` : sheetName;
        const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(fullRange)}?key=${API_KEY}`;

        // Create a controller for aborting the fetch after a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google Sheets API Error Details:', JSON.stringify(errorData, null, 2));
            throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const values = data.values || [];

        try {
            await setCache(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                values: values
            }));
        } catch (cacheError) {
            console.warn('Could not save to cache:', cacheError);
        }

        return values;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`Request for sheet "${sheetName}" timed out after 10s`);
        } else {
            console.error(`Error fetching sheet "${sheetName}":`, error);
        }
        throw error;
    }
};

/**
 * Parse sheet data into objects based on header row
 * @param {Array} rawData - 2D array from Google Sheets
 * @returns {Array<Object>} - Array of objects with keys from header row
 */
export const parseSheetData = (rawData) => {
    if (!rawData || rawData.length === 0) {
        return [];
    }

    const headers = rawData[0].map(header =>
        header.toString().trim().toLowerCase().replace(/\s+/g, '_')
    );

    const rows = rawData.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            const value = row[index];
            // Try to parse numbers
            if (value !== undefined && value !== '') {
                const numValue = Number(value);
                obj[header] = isNaN(numValue) ? value : numValue;
            } else {
                obj[header] = value || '';
            }
        });
        return obj;
    }).filter(obj => {
        // Filter out completely empty rows
        return Object.values(obj).some(val => val !== '');
    });
};

/**
 * Fetch and parse a sheet in one call
 * @param {string} sheetName - Name of the sheet tab
 * @param {string} range - Optional range
 * @param {string} spreadsheetId - Optional spreadsheet ID
 * @param {boolean} forceRefresh - Bypass cache
 * @param {boolean} cacheOnly - Only return cache, don't fetch from network
 * @returns {Promise<Array<Object>>} - Parsed data as array of objects
 */
export const fetchAndParseSheet = async (sheetName, range = '', spreadsheetId = SPREADSHEET_ID, forceRefresh = false, cacheOnly = false) => {
    const rawData = await fetchSheetData(sheetName, range, spreadsheetId, forceRefresh, cacheOnly);
    if (!rawData) {
        return null; // API key not configured or cache empty
    }
    return parseSheetData(rawData);
};
