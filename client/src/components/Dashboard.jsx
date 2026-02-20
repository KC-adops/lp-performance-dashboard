import React, { useState, useEffect } from 'react';
import Filters from './Filters';
import SummaryTable from './SummaryTable';
import { fetchSummaryReport, fetchPVData, fetchCostData } from '../services/dataService';
import { calculateCosts, aggregateMetrics, filterData, aggregateByMerchant, sortLPNumbers } from '../utils/calculations';
import { clearCache } from '../utils/indexedDB';
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
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUsingMock, setIsUsingMock] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                // SWR Phase 1: Try Cache
                setIsLoading(true);
                const [summaryCache, costCache] = await Promise.all([
                    fetchSummaryReport(false, true),
                    fetchCostData(false, true)
                ]);

                if (!isMounted) return;

                const hasCache = summaryCache.length > 0;

                if (hasCache) {
                    const pv = [];
                    const withCosts = calculateCosts(summaryCache, pv, costCache);
                    setProcessedData(withCosts);
                    setFilterOptions({
                        media: [...new Set(summaryCache.map(item => item.media))].filter(Boolean),
                        method: [...new Set(summaryCache.map(item => item.method))].filter(Boolean),
                        method2: [...new Set(summaryCache.map(item => item.method2))].filter(Boolean),
                        lp_number: sortLPNumbers([...new Set(summaryCache.map(item => item.lp_number))].filter(Boolean))
                    });
                    setIsLoading(false); // Hide skeleton
                    setIsRefreshing(true); // Show refreshing badge
                } else {
                    // Absolute first load, we must keep isLoading=true to show skeleton
                    setIsLoading(true);
                }

                // SWR Phase 2: Fetch Fresh Network Data
                const [summaryFresh, costFresh] = await Promise.all([
                    fetchSummaryReport(true, false),
                    fetchCostData(true, false)
                ]);

                if (!isMounted) return;

                const pvFresh = [];

                if (summaryFresh.length > 0 &&
                    summaryFresh[0].date === '2025-01-28' &&
                    summaryFresh[0].lp_number === 'LP001' &&
                    summaryFresh[0].merchant === 'acom') {
                    setIsUsingMock(true);
                } else {
                    setIsUsingMock(false);
                }

                const withCostsFresh = calculateCosts(summaryFresh, pvFresh, costFresh);
                setProcessedData(withCostsFresh);
                setFilterOptions({
                    media: [...new Set(summaryFresh.map(item => item.media))].filter(Boolean),
                    method: [...new Set(summaryFresh.map(item => item.method))].filter(Boolean),
                    method2: [...new Set(summaryFresh.map(item => item.method2))].filter(Boolean),
                    lp_number: sortLPNumbers([...new Set(summaryFresh.map(item => item.lp_number))].filter(Boolean))
                });
            } catch (err) {
                console.error('Error loading data:', err);
                if (isMounted) setError('データの読み込みに失敗しました。');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                }
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, []);

    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-title-row">
                    <h1>LP Performance Dashboard</h1>
                    <div className="header-badges">
                        <span className="badge">LIVE DATA</span>
                        <span className="badge secondary">SCENARIO COMPARISON</span>
                        {isUsingMock && <span className="mock-badge">Using Mock Data</span>}
                        {isRefreshing && <span className="badge" style={{ backgroundColor: '#eab308', color: '#fff' }}>🔄 REFRESHING</span>}
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
                    <button className="btn-primary" onClick={async () => {
                        await clearCache();
                        window.location.reload();
                    }}>
                        <span className="btn-icon">🔄</span>
                        全体更新
                    </button>
                </div>
            </header>

            <div className="dashboard-content">
                <main className="main-content">
                    {isLoading ? (
                        <div className="skeleton-container">
                            <div className="skeleton-line" style={{ width: '30%', height: '32px' }}></div>
                            <div className="skeleton-box" style={{ width: '100%', height: '400px', marginTop: '20px' }}></div>
                            <div className="skeleton-line" style={{ width: '20%', height: '32px', marginTop: '40px' }}></div>
                            <div className="skeleton-box" style={{ width: '100%', height: '400px', marginTop: '20px' }}></div>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
