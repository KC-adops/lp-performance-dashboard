import React, { useState, useEffect } from 'react';
import Filters from './Filters';
import SummaryTable from './SummaryTable';
import { filterData, aggregateMetrics, aggregateByMerchant } from '../utils/calculations';
import { downloadCSV } from '../utils/csvExport';

const ReportSection = ({ sectionId, sectionName, processedData, filterOptions }) => {
    // Keys for localStorage
    const STORAGE_KEYS = {
        unitPrices: `lp_dashboard_${sectionId}_unit_prices`,
        unitEstRates: `lp_dashboard_${sectionId}_est_rates`,
        diffRate: `lp_dashboard_${sectionId}_diff_rate`
    };

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        media: '',
        method: '',
        method2: '',
        lp_number: ''
    });

    const [appliedFilters, setAppliedFilters] = useState(filters);

    const [unitPrices, setUnitPrices] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.unitPrices);
        return saved ? JSON.parse(saved) : {
            acom: 65000,
            promise: 62000,
            mobit: 16000,
            aiful: 50161
        };
    });

    const [unitEstRates, setUnitEstRates] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.unitEstRates);
        return saved ? JSON.parse(saved) : {
            acom: 20.0,
            promise: 20.0,
            mobit: 80.0,
            aiful: 20.0
        };
    });

    const [diffRate, setDiffRate] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.diffRate);
        return saved ? parseFloat(saved) : 0;
    });

    const [metrics, setMetrics] = useState({
        mCV: 0,
        mCPA: 0,
        rCV: 0,
        rCVR: 0,
        results: 0,
        conversionRate: 0,
        allowableCpa: 0,
        rCPA: 0,
        cost: 0,
        actualRoas: 0,
        estAllowableCpa: 0,
        estRoas: 0
    });

    const [merchantData, setMerchantData] = useState([]);

    // Save to localStorage whenever values change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.unitPrices, JSON.stringify(unitPrices));
    }, [unitPrices, STORAGE_KEYS.unitPrices]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.unitEstRates, JSON.stringify(unitEstRates));
    }, [unitEstRates, STORAGE_KEYS.unitEstRates]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.diffRate, diffRate.toString());
    }, [diffRate, STORAGE_KEYS.diffRate]);

    useEffect(() => {
        const filtered = filterData(processedData, appliedFilters);
        const summary = aggregateMetrics(filtered, unitPrices, unitEstRates);
        const merchants = aggregateByMerchant(filtered, unitPrices, unitEstRates);
        setMetrics(summary);
        setMerchantData(merchants);
    }, [processedData, appliedFilters, unitPrices, unitEstRates]);

    const handleApplyFilters = () => {
        setAppliedFilters(filters);
    };

    const handleUnitPriceChange = (merchant, value) => {
        setUnitPrices(prev => ({
            ...prev,
            [merchant]: parseFloat(value) || 0
        }));
    };

    const handleEstRateChange = (merchant, value) => {
        setUnitEstRates(prev => ({
            ...prev,
            [merchant]: parseFloat(value) || 0
        }));
    };

    const handleDownloadCSV = () => {
        try {
            // Explicit column order for CSV
            const CSV_HEADERS = [
                '商材名', 'mCV', 'mCV比率', 'mCPA', 'rCV', 'rCVR', 'rCV比率',
                '成果数', '成果率', '単価', '期待報酬', '許容CPA', '許容CPA_差分込み',
                'rCPA', '広告費', 'ROAS(実績)', '成果率(想定)', '許容CPA(想定)',
                '差分率', '許容CPA(想定)_差分込み', 'ROAS(想定)'
            ];

            const fmt = (val, digits = 2) => ((val || 0).toFixed(digits)) + '%';

            // Prepare data for export
            const exportData = merchantData.map(row => ({
                '商材名': row.merchant?.toUpperCase() || '',
                'mCV': row.mCV || 0,
                'mCV比率': fmt((row.mCV / (metrics.mCV || 1)) * 100),
                'mCPA': Math.round(row.mCPA || 0),
                'rCV': row.rCV || 0,
                'rCVR': fmt(row.rCVR),
                'rCV比率': fmt(row.rCVRatio),
                '成果数': row.results || 0,
                '成果率': fmt(row.conversionRate),
                '単価': unitPrices[row.merchant?.toLowerCase()] || 0,
                '期待報酬': Math.round(row.cvrUnitPrice || 0),
                '許容CPA': Math.round(row.allowableCpaPerItem || 0),
                '許容CPA_差分込み': Math.round((row.allowableCpaPerItem || 0) * (1 + (diffRate || 0) / 100)),
                'rCPA': Math.round(row.rCPA || 0),
                '広告費': Math.round(row.cost || 0),
                'ROAS(実績)': fmt(row.actualRoas),
                '成果率(想定)': fmt(unitEstRates[row.merchant?.toLowerCase()] || 0),
                '許容CPA(想定)': Math.round(row.estAllowableCpa || 0),
                '差分率': (diffRate || 0) + '%',
                '許容CPA(想定)_差分込み': Math.round((row.estAllowableCpa || 0) * (1 + (diffRate || 0) / 100)),
                'ROAS(想定)': fmt(row.estRoas)
            }));

            // Add Total row
            exportData.push({
                '商材名': 'TOTAL',
                'mCV': metrics.mCV || 0,
                'mCV比率': '100.00%',
                'mCPA': Math.round(metrics.mCPA || 0),
                'rCV': metrics.rCV || 0,
                'rCVR': fmt(metrics.rCVR),
                'rCV比率': '100.00%',
                '成果数': metrics.results || 0,
                '成果率': fmt(metrics.conversionRate),
                '単価': '-',
                '期待報酬': Math.round(metrics.cvrUnitPrice || 0),
                '許容CPA': Math.round(metrics.allowableCpa || 0),
                '許容CPA_差分込み': Math.round((metrics.allowableCpa || 0) * (1 + (diffRate || 0) / 100)),
                'rCPA': Math.round(metrics.rCPA || 0),
                '広告費': Math.round(metrics.cost || 0),
                'ROAS(実績)': fmt(metrics.actualRoas),
                '成果率(想定)': '-',
                '許容CPA(想定)': Math.round(metrics.estAllowableCpa || 0),
                '差分率': (diffRate || 0) + '%',
                '許容CPA(想定)_差分込み': Math.round((metrics.estAllowableCpa || 0) * (1 + (diffRate || 0) / 100)),
                'ROAS(想定)': fmt(metrics.estRoas)
            });

            downloadCSV(exportData, `${sectionName}_report_${new Date().toISOString().split('T')[0]}.csv`, CSV_HEADERS);
        } catch (err) {
            console.error('CSVダウンロードエラー:', err);
            alert('CSVダウンロードに失敗しました: ' + err.message);
        }
    };

    return (
        <section className="report-section">
            <div className="section-header">
                <h2 className="section-title">{sectionName}</h2>
                <button className="download-btn" onClick={handleDownloadCSV}>
                    <span className="btn-icon">📥</span>
                    CSVダウンロード
                </button>
            </div>

            <Filters
                filters={filters}
                setFilters={setFilters}
                options={filterOptions}
                onApply={handleApplyFilters}
            />

            <SummaryTable
                metrics={metrics}
                groupedData={merchantData}
                unitPrices={unitPrices}
                unitEstRates={unitEstRates}
                diffRate={diffRate}
                onUnitPriceChange={handleUnitPriceChange}
                onEstRateChange={handleEstRateChange}
                onDiffRateChange={setDiffRate}
            />
        </section>
    );
};

export default ReportSection;
