import { fetchAndParseSheet } from './googleSheetsClient';

// Mock Data for Summary_Report (Fallback)
const mockSummaryReportData = [
  { date: '2025-01-28', lp_number: 'LP001', media: 'Acom', method: 'Direct', method2: 'TestA', merchant: 'acom', mCV: 15, rCV: 5, results: 2, cost: 0 },
  { date: '2025-01-28', lp_number: 'LP001', media: 'Acom', method: 'Direct', method2: 'TestB', merchant: 'promis', mCV: 20, rCV: 8, results: 1, cost: 0 },
  { date: '2025-01-28', lp_number: 'LP001', media: 'Acom', method: 'Direct', method2: 'TestA', merchant: 'mobit', mCV: 10, rCV: 2, results: 0, cost: 0 },
  { date: '2025-01-28', lp_number: 'LP001', media: 'Acom', method: 'Search', method2: 'TestB', merchant: 'aiful', mCV: 5, rCV: 1, results: 0, cost: 0 },
  { date: '2025-01-29', lp_number: 'LP002', media: 'Promis', method: 'Search', method2: 'TestC', merchant: 'promis', mCV: 30, rCV: 12, results: 3, cost: 0 }
];

// Mock Data for SquadBeyond_Data (PV Data) (Fallback)
const mockPvData = [
  { date: '2025-01-28', media: 'Acom', lp_number: 'LP001', pv: 1200 },
  { date: '2025-01-28', media: 'Promis', lp_number: 'LP002', pv: 800 },
  { date: '2025-01-29', media: 'Acom', lp_number: 'LP001', pv: 1300 },
  { date: '2025-01-30', media: 'Mobit', lp_number: 'LP003', pv: 500 }
];

// Mock Data for Total Cost (Fallback)
const mockCostData = [
  { date: '2025-01-28', media: 'Acom', total_cost: 50000 },
  { date: '2025-01-28', media: 'Promis', total_cost: 30000 },
  { date: '2025-01-29', media: 'Acom', total_cost: 55000 },
  { date: '2025-01-30', media: 'Mobit', total_cost: 20000 }
];

/**
 * Fetch Summary Report from Google Sheets or fallback to mock data
 */
export const fetchSummaryReport = async (forceRefresh = false, cacheOnly = false) => {
  try {
    const data = await fetchAndParseSheet('Summary_Report', '', undefined, forceRefresh, cacheOnly);

    if (data === null) {
      if (cacheOnly) return []; // Don't return mock data on a cache miss during SWR
      console.log('fetchSummaryReport: API Key/ID missing, returning mock data.');
      return mockSummaryReportData;
    }

    console.log(`fetchSummaryReport: Successfully fetched ${data.length} rows from Google Sheets.`);

    if (data.length === 0) {
      console.warn('Google Sheets returned empty Summary Report');
      return [];
    }

    const firstRow = data[0];
    const headers = Object.keys(firstRow);

    // Detect merchants (prefixes of columns ending in _mcv, _rcv, _application, _withdrawal, or _contract/_成果数)
    const merchants = new Set();
    headers.forEach(key => {
      const match = key.match(/^(.+)_(mcv|rcv|contract|成果数|application|withdrawal)$/i);
      if (match) merchants.add(match[1]);
    });

    const merchantList = [...merchants];
    console.log('Detected merchants in sheet:', merchantList);

    const transformed = [];

    data.forEach((row) => {
      const common = {
        date: row.date || row['日付'] || '',
        lp_number: row.lp_number || row['lp番号'] || row.lp || '', // Map B列
        media: row.media || row['媒体'] || '',
        method: row.method || row['手法'] || '',
        method2: row.method2 || row['手法2'] || '',
      };

      merchantList.forEach(m => {
        const mcv = Number(row[`${m}_mcv`] || 0);
        const rcv = Number(row[`${m}_rcv`] || row[`${m}_rcv数`] || 0);

        // Custom result column mappings based on user requests
        let results = 0;
        if (m === 'mobit') {
          results = Number(row[`${m}_application`] || row[`${m}_contract`] || row[`${m}_成果数`] || 0);
        } else if (m === 'promise') {
          results = Number(row[`${m}_withdrawal`] || row[`${m}_contract`] || row[`${m}_成果数`] || 0);
        } else if (m === 'acom' || m === 'aiful') {
          results = Number(row[`${m}_contract`] || row[`${m}_成果数`] || 0);
        } else {
          results = Number(row[`${m}_contract`] || row[`${m}_成果数`] || 0);
        }

        // Include if any metric > 0, or if it's Aiful (user request)
        if (mcv > 0 || rcv > 0 || results > 0 || m === 'aiful') {
          transformed.push({
            ...common,
            merchant: m,
            mCV: mcv,
            rCV: rcv,
            results: results,
            cost: 0
          });
        }
      });
    });

    console.log(`Parsed ${transformed.length} merchant records from ${data.length} rows`);
    return transformed;
  } catch (error) {
    console.error('Error in fetchSummaryReport:', error);
    return mockSummaryReportData;
  }
};

/**
 * Fetch PV Data from Google Sheets or fallback to mock data
 */
export const fetchPVData = async (forceRefresh = false, cacheOnly = false) => {
  try {
    const data = await fetchAndParseSheet('SquadBeyond_Data', '', undefined, forceRefresh, cacheOnly);

    if (data === null) {
      if (cacheOnly) return [];
      console.log('Using mock PV data');
      return mockPvData;
    }

    const transformed = data.map(row => ({
      date: row.date || row['日付'] || '',
      media: row.media || row['媒体'] || '',
      lp_number: row.lp_number || row['lp番号'] || row.lp || '',
      pv: Number(row.pv || row['ページビュー'] || row['pageview'] || 0)
    }));

    console.log('Fetched PV Data from Google Sheets:', transformed.length, 'rows');
    return transformed;
  } catch (error) {
    console.error('Error fetching PV Data, using mock data:', error);
    return mockPvData;
  }
};

/**
 * Fetch Cost Data from the consolidated cost spreadsheet
 */
export const fetchCostData = async (forceRefresh = false, cacheOnly = false) => {
  const COST_SPREADSHEET_ID = import.meta.env.VITE_COST_SPREADSHEET_ID;

  try {
    // If no cost spreadsheet ID is configured, fallback to mock data
    if (!COST_SPREADSHEET_ID) {
      if (cacheOnly) return [];
      console.warn('VITE_COST_SPREADSHEET_ID not configured. Using mock data.');
      return mockCostData;
    }

    const data = await fetchAndParseSheet('広告費まとめ_LP別', '', COST_SPREADSHEET_ID, forceRefresh, cacheOnly);
    if (!cacheOnly) console.log('fetchCostData: RAW DATA SAMPLE:', data ? data.slice(0, 3) : 'NULL');

    if (!data || data.length === 0) {
      if (cacheOnly) return [];
      console.warn('No cost data found in the consolidated sheet.');
      return mockCostData;
    }

    const transformed = data.map(row => {
      // Helper to strip commas and other non-numeric chars (except dot)
      const parseNum = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const cleaned = val.toString().replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
      };

      return {
        date: row.date || row['日付'] || '',
        media: row.media || '',
        method: row.method || row['手法'] || '',
        method2: row.method2 || row['手法2'] || '',
        lp_number: row.lp_number || row['lp番号'] || '',
        total_cost: parseNum(row.total_cost || row['消化金額'] || row.cost)
      };
    });

    console.log(`fetchCostData: Successfully fetched ${transformed.length} rows from consolidated cost sheet.`);
    return transformed;
  } catch (error) {
    console.error('Error fetching Cost Data from consolidated sheet:', error);
    return mockCostData;
  }
};
