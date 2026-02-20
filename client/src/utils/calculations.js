const UNIT_PRICES = {
    acom: 85000,
    promise: 62000,
    mobit: 16000,
    aiful: 50161
};

const EST_CONVERSION_RATE = 20.0;

const UNIT_EST_RATES = {
    acom: 20.0,
    promise: 20.0,
    mobit: 20.0,
    aiful: 20.0
};

/**
 * Utility to normalize strings for comparison/matching
 */
const normalize = (str) => {
    if (str === undefined || str === null) return '';
    let val = str.toString().trim().toLowerCase();
    // Normalize date separators if it looks like a date (e.g. 2024/01/01 -> 2024-01-01)
    if (/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(val)) {
        val = val.replace(/\//g, '-');
        // Ensure leading zeros if necessary (2024-1-1 -> 2024-01-01)
        const parts = val.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].split(' ')[0].padStart(2, '0'); // ignore time if present
            val = `${year}-${month}-${day}`;
        }
    }
    return val;
};

/**
 * Matches cost data to summary records using granular keys (date, media, lp_number, method, method2).
 * Strictly refers to the consolidated cost sheet and ignores '未振分' (unassigned) rows.
 */
export const calculateCosts = (summaryData, pvData, costData) => {
    // Note: pvData is ignored as per user confirmation to rely solely on the cost sheet.

    // Create a granular map for cost matching with normalization
    const costMap = {};
    const mediaCostMap = {}; // Broad fallback for rows that have media/date but maybe no specific LP/Method

    costData.forEach(item => {
        const lp = normalize(item.lp_number);
        // Exclude '未振分' (unassigned) rows as per user request
        if (lp === '未振分' || lp === 'none' || lp === '') return;

        const d = normalize(item.date);
        const m = normalize(item.media);
        const meth = normalize(item.method);
        const meth2 = normalize(item.method2);

        // Granular key
        const key = `${d}_${m}_${lp}_${meth}_${meth2}`;
        costMap[key] = (costMap[key] || 0) + (item.total_cost || 0);

        // Media aggregate key (for broader distribution if the sheet doesn't have LP breakdown for some rows)
        const mKey = `${d}_${m}`;
        mediaCostMap[mKey] = (mediaCostMap[mKey] || 0) + (item.total_cost || 0);
    });

    // First pass: Try to assign costs directly
    const assignedCosts = summaryData.map(record => {
        const d = normalize(record.date);
        const m = normalize(record.media);
        const lp = normalize(record.lp_number);
        const meth = normalize(record.method);
        const meth2 = normalize(record.method2);

        const granularKey = `${d}_${m}_${lp}_${meth}_${meth2}`;
        const directCost = costMap[granularKey];

        if (directCost !== undefined && directCost > 0) {
            const count = summaryData.filter(r =>
                normalize(r.date) === d &&
                normalize(r.media) === m &&
                normalize(r.lp_number) === lp &&
                normalize(r.method) === meth &&
                normalize(r.method2) === meth2
            ).length;
            return { ...record, cost: directCost / (count || 1), matched: true };
        }
        return { ...record, cost: 0, matched: false };
    });

    // Second pass: fallback distribution (Equal split) for any remaining aggregate media cost
    // This handles cases where the cost sheet has a row for (Date, Media) but no specific LP info,
    // and that row NOT being marked as '未振分'.
    const finalData = assignedCosts.map(record => {
        if (record.matched) return record;

        const d = normalize(record.date);
        const m = normalize(record.media);
        const dateMediaKey = `${d}_${m}`;
        const totalMediaCost = mediaCostMap[dateMediaKey] || 0;

        if (totalMediaCost > 0) {
            const alreadyAssigned = assignedCosts
                .filter(r => r.matched && normalize(r.date) === d && normalize(r.media) === m)
                .reduce((sum, r) => sum + r.cost, 0);

            const remainingCost = Math.max(0, totalMediaCost - alreadyAssigned);

            if (remainingCost > 0) {
                const unmatchedForMediaCount = assignedCosts.filter(r =>
                    !r.matched && normalize(r.date) === d && normalize(r.media) === m
                ).length;

                return { ...record, cost: remainingCost / (unmatchedForMediaCount || 1) };
            }
        }
        return record;
    });

    return finalData.map(({ matched, ...rest }) => rest);
};

/**
 * Aggregates metrics by Merchant for the table display.
 * Derives complex financial KPIs from basic metrics.
 */
export const aggregateByMerchant = (data, unitPrices = UNIT_PRICES, unitEstRates = UNIT_EST_RATES) => {
    const merchantStats = {};
    const standardMerchants = ['acom', 'promise', 'mobit', 'aiful'];

    // Initialize all standard merchants with 0 values
    standardMerchants.forEach(m => {
        merchantStats[m] = { merchant: m, mCV: 0, rCV: 0, results: 0, cost: 0 };
    });

    let totalRCV = 0;

    data.forEach(item => {
        const m = item.merchant?.toLowerCase();
        if (m) {
            if (!merchantStats[m]) {
                merchantStats[m] = { merchant: m, mCV: 0, rCV: 0, results: 0, cost: 0 };
            }
            merchantStats[m].mCV += item.mCV || 0;
            merchantStats[m].rCV += item.rCV || 0;
            merchantStats[m].results += item.results || 0;
            merchantStats[m].cost += item.cost || 0;
            totalRCV += item.rCV || 0;
        }
    });

    const sortOrder = ['acom', 'promise', 'mobit', 'aiful'];

    return Object.values(merchantStats)
        .map(stat => {
            const mKey = stat.merchant.toLowerCase();
            const unitPrice = unitPrices[mKey] || 50000;

            // Calculated KPIs
            const mCPA = stat.mCV > 0 ? stat.cost / stat.mCV : 0;
            const rCVR = stat.mCV > 0 ? (stat.rCV / stat.mCV) * 100 : 0;
            const rCVRatio = totalRCV > 0 ? (stat.rCV / totalRCV) * 100 : 0;
            const conversionRate = stat.rCV > 0 ? (stat.results / stat.rCV) * 100 : 0;
            const cvrUnitPrice = (conversionRate / 100) * unitPrice;

            // Allowable CPA = rCV Ratio × Conversion Rate × Unit Price
            // Divide by 10000 because both Ratio and Rate are in percent (0-100)
            const allowableCpaPerItem = (rCVRatio / 100) * (conversionRate / 100) * unitPrice;

            const actualRoas = stat.cost > 0 ? (stat.results * unitPrice / stat.cost) * 100 : 0;
            const rCPA = stat.rCV > 0 ? stat.cost / stat.rCV : 0;

            // Estimated Values (Assumed)
            const estConversionRate = unitEstRates[mKey] || EST_CONVERSION_RATE;
            const estAllowableCpa = (rCVRatio / 100) * (estConversionRate / 100) * unitPrice;
            const estRoas = stat.cost > 0 ? (stat.rCV * (estConversionRate / 100) * unitPrice / stat.cost) * 100 : 0;

            return {
                ...stat,
                unitPrice,
                mCPA,
                rCVR,
                rCVRatio,
                conversionRate,
                cvrUnitPrice,
                allowableCpaPerItem,
                actualRoas,
                rCPA,
                estConversionRate,
                estAllowableCpa,
                estRoas
            };
        })
        .sort((a, b) => {
            const indexA = sortOrder.indexOf(a.merchant.toLowerCase());
            const indexB = sortOrder.indexOf(b.merchant.toLowerCase());
            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });
};

/**
 * Aggregates metrics based on filtered data for the overall dashboard.
 */
export const aggregateMetrics = (data, unitPrices = UNIT_PRICES, unitEstRates = UNIT_EST_RATES) => {
    const totals = data.reduce((acc, curr) => {
        acc.mCV += curr.mCV || 0;
        acc.rCV += curr.rCV || 0;
        acc.results += curr.results || 0;
        acc.cost += curr.cost || 0;
        return acc;
    }, { mCV: 0, rCV: 0, results: 0, cost: 0 });

    // Overall aggregate KPIs
    const mCPA = totals.mCV > 0 ? totals.cost / totals.mCV : 0;
    const rCVR = totals.mCV > 0 ? (totals.rCV / totals.mCV) * 100 : 0;
    const rCPA = totals.rCV > 0 ? totals.cost / totals.rCV : 0;

    // Calculate total actual and estimated allowable CPAs
    const merchantGroups = {};
    data.forEach(item => {
        const m = item.merchant;
        if (!merchantGroups[m]) {
            merchantGroups[m] = { rCV: 0, results: 0 };
        }
        merchantGroups[m].rCV += item.rCV || 0;
        merchantGroups[m].results += item.results || 0;
    });

    let totalRCV = 0;
    Object.keys(merchantGroups).forEach(m => {
        totalRCV += merchantGroups[m].rCV;
    });

    let totalAllowableCpa = 0;
    let totalEstAllowableCpa = 0;
    let totalWeightedEstRoasNumerator = 0;

    Object.keys(merchantGroups).forEach(m => {
        const mKey = m.toLowerCase();
        const unitPrice = unitPrices[mKey] || 50000;
        const estConversionRate = unitEstRates[mKey] || EST_CONVERSION_RATE;
        const stats = merchantGroups[m];

        const rCVRatio = totalRCV > 0 ? (stats.rCV / totalRCV) * 100 : 0;
        const conversionRate = stats.rCV > 0 ? (stats.results / stats.rCV) * 100 : 0;

        // Actual allowable CPA total = Sum of (Target Ratio * Target CVR * Unit Price)
        totalAllowableCpa += (rCVRatio / 100) * (conversionRate / 100) * unitPrice;

        // Estimated allowable CPA total = Sum of (Target Ratio * Assumed CVR * Unit Price)
        totalEstAllowableCpa += (rCVRatio / 100) * (estConversionRate / 100) * unitPrice;

        // For Overall Est ROAS: sum(rCV * estCVR * unitPrice) / totalCost
        totalWeightedEstRoasNumerator += stats.rCV * (estConversionRate / 100) * unitPrice;
    });

    const conversionRate = totals.rCV > 0 ? (totals.results / totals.rCV) * 100 : 0;

    // Total Actual ROAS: totalRevenue / totalCost
    // Revenue is sum of results * unitPrice across merchants
    let totalActualRevenue = 0;
    data.forEach(item => {
        const mKey = item.merchant.toLowerCase();
        const unitPrice = unitPrices[mKey] || 50000;
        totalActualRevenue += (item.results || 0) * unitPrice;
    });

    const actualRoas = totals.cost > 0 ? (totalActualRevenue / totals.cost) * 100 : 0;
    const estRoas = totals.cost > 0 ? (totalWeightedEstRoasNumerator / totals.cost) * 100 : 0;

    return {
        ...totals,
        mCPA,
        rCVR,
        rCPA,
        actualRoas,
        conversionRate,
        allowableCpa: totalAllowableCpa,
        estAllowableCpa: totalEstAllowableCpa,
        estRoas
    };
};

/**
 * Filter data based on user criteria
 */
export const filterData = (data, filters) => {
    return data.filter(item => {
        if (filters.media && item.media !== filters.media) return false;
        if (filters.method && item.method !== filters.method) return false;
        if (filters.method2 && item.method2 !== filters.method2) return false;
        if (filters.lp_number && item.lp_number !== filters.lp_number) return false;
        if (filters.startDate && new Date(item.date) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(item.date) > new Date(filters.endDate)) return false;
        return true;
    });
};

/**
 * Sorts LP IDs numerically (e.g., LP1, LP2, LP10).
 * Supports format: LP[Number]-[Number] or LP[Number].
 */
export const sortLPNumbers = (lpList) => {
    return [...lpList].sort((a, b) => {
        // Special case: None/Empty values go to the top
        if (a === 'LP_None' || !a) return -1;
        if (b === 'LP_None' || !b) return 1;

        // Extract numbers using regex
        const matchA = a.match(/LP(\d+)(?:-(\d+))?/i);
        const matchB = b.match(/LP(\d+)(?:-(\d+))?/i);

        // If both follow the LP pattern, compare them numerically
        if (matchA && matchB) {
            const numA1 = parseInt(matchA[1], 10);
            const numB1 = parseInt(matchB[1], 10);

            if (numA1 !== numB1) {
                return numA1 - numB1;
            }

            // If first numbers are same, compare second numbers if they exist
            const numA2 = matchA[2] ? parseInt(matchA[2], 10) : 0;
            const numB2 = matchB[2] ? parseInt(matchB[2], 10) : 0;
            return numA2 - numB2;
        }

        // Fallback to alphabetical if pattern doesn't match
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
};
