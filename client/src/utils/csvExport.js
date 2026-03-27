/**
 * Utility to export JSON data to CSV and trigger browser download.
 * @param {Object[]} data - Array of row objects
 * @param {string} filename - Output filename
 * @param {string[]} [headers] - Optional explicit header list (if omitted, derived from all rows)
 */
export const downloadCSV = (data, filename = 'report.csv', headers = null) => {
    if (!data || !data.length) return;

    // Collect headers from all rows to avoid missing keys from the first row only
    const allKeys = headers || (() => {
        const keySet = new Set();
        data.forEach(row => Object.keys(row).forEach(k => keySet.add(k)));
        return Array.from(keySet);
    })();

    const csvRows = [];

    // Add header row
    csvRows.push(allKeys.map(h => `"${h}"`).join(','));

    // Add data rows
    for (const row of data) {
        const values = allKeys.map(header => {
            const val = row[header] !== undefined ? row[header] : '';
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
