import React, { useState, useEffect } from 'react';
import Filters from './Filters';
import SummaryTable from './SummaryTable';
import { fetchSummaryReport, fetchPVData, fetchCostData } from '../services/dataService';
import { calculateCosts, aggregateMetrics, filterData, aggregateByMerchant, sortLPNumbers } from '../utils/calculations';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [rawData, setRawData] = useState([]);
    const [processedData, setProcessedData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [metrics, setMetrics] = useState({
        mCV: 0,
        rCV: 0,
        results: 0,
        cost: 0,
        mCPA: 0,
        rCPA: 0,
        rCVR: 0,
        roas: 0
    });

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        media: '',
        method: '',
        method2: '',
        lp_number: ''
    });

    const [appliedFilters, setAppliedFilters] = useState({
        startDate: '',
        endDate: '',
        media: '',
        method: '',
        method2: '',
        lp_number: ''
    });

    const [isUsingMock, setIsUsingMock] = useState(false);
    const [merchantData, setMerchantData] = useState([]);

    const [filterOptions, setFilterOptions] = useState({
        media: [],
        method: [],
        method2: [],
        lp_number: []
    });

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            const [summary, cost] = await Promise.all([
                fetchSummaryReport(),
                fetchCostData()
            ]);

            const pv = []; // PV data is now ignored per user instruction

            // More robust check: use a property that only exists in transformed live data or mock data
            // Since we know the mock data date/lp_number, we check that specifically.
            // Also, check if it's the exact same object as mockSummaryReportData[0]
            if (summary.length > 0 &&
                summary[0].date === '2025-01-28' &&
                summary[0].lp_number === 'LP001' &&
                summary[0].merchant === 'acom') {
                setIsUsingMock(true);
                console.log('Dashboard: Detected mock data based on initial record.');
            } else {
                setIsUsingMock(false);
                console.log('Dashboard: Using live data from Google Sheets.');
            }

            // Calculate costs for each LP
            const withCosts = calculateCosts(summary, pv, cost);
            setRawData(summary);
            setProcessedData(withCosts);
            setFilteredData(withCosts);
            setAppliedFilters(filters);

            // Extract unique values for filter dropdowns
            const uniqueMedia = [...new Set(summary.map(item => item.media))].filter(Boolean);
            const uniqueMethod = [...new Set(summary.map(item => item.method))].filter(Boolean);
            const uniqueMethod2 = [...new Set(summary.map(item => item.method2))].filter(Boolean);
            const uniqueLP = [...new Set(summary.map(item => item.lp_number))].filter(Boolean);

            setFilterOptions({
                media: uniqueMedia,
                method: uniqueMethod,
                method2: uniqueMethod2,
                lp_number: sortLPNumbers(uniqueLP)
            });
        };

        loadData();
    }, []);

    const [unitPrices, setUnitPrices] = useState({
        acom: 85000,
        promise: 62000,
        mobit: 16000,
        aiful: 50161
    });

    const [unitEstRates, setUnitEstRates] = useState({
        acom: 20.0,
        promise: 20.0,
        mobit: 20.0,
        aiful: 20.0
    });

    const [diffRate, setDiffRate] = useState(0);

    // Apply filters whenever appliedFilters change or editable metrics change
    useEffect(() => {
        const filtered = filterData(processedData, appliedFilters);
        setFilteredData(filtered);

        // Aggregate overall metrics with dynamic unit prices
        const newMetrics = aggregateMetrics(filtered, unitPrices, unitEstRates);
        setMetrics(newMetrics);

        // Aggregate by merchant for the table with dynamic unit prices and est rates
        const byMerchant = aggregateByMerchant(filtered, unitPrices, unitEstRates);
        setMerchantData(byMerchant);
    }, [appliedFilters, processedData, unitPrices, unitEstRates]);

    const handleApplyFilters = () => {
        setAppliedFilters(filters);
    };

    const handleUnitPriceChange = (merchant, value) => {
        setUnitPrices(prev => ({
            ...prev,
            [merchant.toLowerCase()]: Number(value)
        }));
    };

    const handleEstRateChange = (merchant, value) => {
        setUnitEstRates(prev => ({
            ...prev,
            [merchant.toLowerCase()]: Number(value)
        }));
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-title-row">
                    <h1>LP Performance Analysis</h1>
                    <div className="header-actions">
                        <a
                            href="https://docs.google.com/spreadsheets/d/1VF-TNOTh0eCQp3pogErC4Zj8DI4XgvRg0aikGCXuPHo/edit"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sheets-link-button"
                            title="Open Summary Google Spreadsheet"
                        >
                            <span className="btn-icon">📊</span>
                            成果表
                        </a>
                        <a
                            href="https://docs.google.com/spreadsheets/d/1mXNkk0X_PX-HgstESN33W0nKT-4aYBTb7iVRzRcNH_M/edit"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sheets-link-button cost-sheet-link"
                            title="Open Cost Google Spreadsheet"
                        >
                            <span className="btn-icon">💰</span>
                            広告費
                        </a>
                        {isUsingMock && (
                            <span className="mock-badge">Using Mock Data (Check .env.local)</span>
                        )}
                    </div>
                </div>
                <p>Analyze your landing page performance with detailed metrics</p>
            </header>

            <div className="dashboard-content">
                <main className="main-content">
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
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
