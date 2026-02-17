/**
 * Google Sheets API Client
 * Handles fetching data from Google Sheets using the Sheets API v4
 */

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;
const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Fetch data from a specific sheet tab
 * @param {string} sheetName - Name of the sheet tab (e.g., 'AFAD_LP_Summary_Report')
 * @param {string} range - Optional range (e.g., 'A1:Z1000'). If not provided, fetches entire sheet.
 * @param {string} spreadsheetId - Optional spreadsheet ID. Defaults to VITE_SPREADSHEET_ID.
 * @returns {Promise<Array>} - 2D array of cell values
 */
export const fetchSheetData = async (sheetName, range = '', spreadsheetId = SPREADSHEET_ID) => {
    if (!API_KEY || API_KEY === 'your_api_key_here') {
        console.warn('Google Sheets API key not configured. Using mock data.');
        return null;
    }

    try {
        const fullRange = range ? `${sheetName}!${range}` : sheetName;
        const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(fullRange)}?key=${API_KEY}`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google Sheets API Error Details:', JSON.stringify(errorData, null, 2));
            throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error(`Error fetching sheet "${sheetName}":`, error);
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
 * @returns {Promise<Array<Object>>} - Parsed data as array of objects
 */
export const fetchAndParseSheet = async (sheetName, range = '', spreadsheetId = SPREADSHEET_ID) => {
    const rawData = await fetchSheetData(sheetName, range, spreadsheetId);
    if (!rawData) {
        return null; // API key not configured
    }
    return parseSheetData(rawData);
};
