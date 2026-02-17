import React, { useState, useEffect } from 'react';
import Filters from './Filters';
import SummaryTable from './SummaryTable';
import { fetchSummaryReport, fetchPVData, fetchCostData } from '../services/dataService';
import { calculateCosts, aggregateMetrics, filterData, aggregateByMerchant, sortLPNumbers } from '../utils/calculations';
import '../styles/Dashboard.css';
import ReportSection from './ReportSection';

const Dashboard = () => {
    const [processedData, setProcessedData] = useState([]);
    const [filterOptions, setFilterOptions] = useState({
        media: [],
        method: [],
        method2: [],
        lp_number: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUsingMock, setIsUsingMock] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [summary, cost] = await Promise.all([
                    fetchSummaryReport(),
                    fetchCostData()
                ]);

                const pv = [];

                if (summary.length > 0 &&
                    summary[0].date === '2025-01-28' &&
                    summary[0].lp_number === 'LP001' &&
                    summary[0].merchant === 'acom') {
                    setIsUsingMock(true);
                } else {
                    setIsUsingMock(false);
                }

                const withCosts = calculateCosts(summary, pv, cost);
                setProcessedData(withCosts);

                setFilterOptions({
                    media: [...new Set(summary.map(item => item.media))].filter(Boolean),
                    method: [...new Set(summary.map(item => item.method))].filter(Boolean),
                    method2: [...new Set(summary.map(item => item.method2))].filter(Boolean),
                    lp_number: sortLPNumbers([...new Set(summary.map(item => item.lp_number))].filter(Boolean))
                });
            } catch (err) {
                console.error('Error loading data:', err);
                setError('データの読み込みに失敗しました。');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    if (isLoading) return (
        <div className="loading-container">
            <div className="loader"></div>
            <p>データを読み込んでいます...</p>
        </div>
    );

    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-title-row">
                    <h1>LP Performance Dashboard</h1>
                    <div className="header-badges">
                        <span className="badge">LIVE DATA</span>
                        <span className="badge secondary">SCENARIO COMPARISON</span>
                        {isUsingMock && (
                            <span className="mock-badge">Using Mock Data</span>
                        )}
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-secondary"
                        onClick={() => window.open('https://docs.google.com/spreadsheets/d/1VF-TNOTh0eCQp3pogErC4Zj8DI4XgvRg0aikGCXuPHo', '_blank')}
                    >
                        <span className="btn-icon">📊</span>
                        成果表 (Sheets)
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => window.open('https://docs.google.com/spreadsheets/d/1mXNkk0X_PX-HgstESN33W0nKT-4aYBTb7iVRzRcNH_M', '_blank')}
                    >
                        <span className="btn-icon">💰</span>
                        広告費 (Sheets)
                    </button>
                    <button className="btn-primary" onClick={() => window.location.reload()}>
                        <span className="btn-icon">🔄</span>
                        全体更新
                    </button>
                </div>
            </header>

            <div className="dashboard-content">
                <main className="main-content">
                    <ReportSection
                        sectionId="a"
                        sectionName="SCENARIO A"
                        processedData={processedData}
                        filterOptions={filterOptions}
                    />

                    <div className="section-divider"></div>

                    <ReportSection
                        sectionId="b"
                        sectionName="SCENARIO B"
                        processedData={processedData}
                        filterOptions={filterOptions}
                    />
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
