import React, { useState, useEffect } from 'react';
import Filters from './Filters';
import SummaryTable from './SummaryTable';
import { filterData, aggregateMetrics, aggregateByMerchant } from '../utils/calculations';
import { downloadCSV } from '../utils/csvExport';

const ReportSection = ({ sectionName, processedData, filterOptions }) => {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        media: '',
        method: '',
        method2: '',
        lp_number: ''
    });

    const [appliedFilters, setAppliedFilters] = useState(filters);

    const [unitPrices, setUnitPrices] = useState({
        acom: 65000,
        promise: 62000,
        mobit: 16000,
        aiful: 50161
    });

    const [unitEstRates, setUnitEstRates] = useState({
        acom: 20.0,
        promise: 20.0,
        mobit: 80.0,
        aiful: 20.0
    });

    const [diffRate, setDiffRate] = useState(0);
    const [diffRate2, setDiffRate2] = useState(0);

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
        // Prepare data for export
        const exportData = merchantData.map(row => ({
            '商材名': row.merchant?.toUpperCase(),
            'mCV': row.mCV,
            'rCV': row.rCV,
            'rCVR': row.rCVR + '%',
            '成果数': row.results,
            '成果率': row.conversionRate + '%',
            '単価': unitPrices[row.merchant?.toLowerCase()] || 0,
            '許容CPA': row.allowableCpaPerItem,
            '成果率(想定)': unitEstRates[row.merchant?.toLowerCase()] || 0 + '%',
            '許容CPA(想定)': row.estAllowableCpa
        }));

        // Add Total row
        exportData.push({
            '商材名': 'TOTAL',
            'mCV': metrics.mCV,
            'rCV': metrics.rCV,
            'rCVR': metrics.rCVR + '%',
            '成果数': metrics.results,
            '成果率': metrics.conversionRate + '%',
            '単価': '-',
            '許容CPA': metrics.allowableCpa,
            '成果率(想定)': '-',
            '許容CPA(想定)': metrics.estAllowableCpa
        });

        downloadCSV(exportData, `${sectionName}_report.csv`);
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
                diffRate2={diffRate2}
                onUnitPriceChange={handleUnitPriceChange}
                onEstRateChange={handleEstRateChange}
                onDiffRateChange={setDiffRate}
                onDiffRateChange2={setDiffRate2}
            />
        </section>
    );
};

export default ReportSection;
