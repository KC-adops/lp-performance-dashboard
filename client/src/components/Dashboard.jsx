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
            // Absolute safety: stop loading after 15s no matter what
            const safetyTimeout = setTimeout(() => {
                if (isMounted && isLoading) {
                    console.warn('Dashboard loading safety timeout triggered');
                    setIsLoading(false);
                }
            }, 15000);

            // Safe phase 1: Try cache
            try {
                setIsLoading(true);
                const results = await Promise.allSettled([
                    fetchSummaryReport(false, true),
                    fetchCostData(false, true)
                ]);

                if (!isMounted) {
                    clearTimeout(safetyTimeout);
                    return;
                }

                const summaryCache = results[0].status === 'fulfilled' ? (results[0].value || []) : [];
                const costCache = results[1].status === 'fulfilled' ? (results[1].value || []) : [];

                if (Array.isArray(summaryCache) && summaryCache.length > 0) {
                    try {
                        const pv = [];
                        const withCosts = calculateCosts(summaryCache, pv, costCache);
                        setProcessedData(withCosts);
                        setFilterOptions({
                            media: [...new Set(summaryCache.map(item => item.media))].filter(Boolean),
                            method: [...new Set(summaryCache.map(item => item.method))].filter(Boolean),
                            method2: [...new Set(summaryCache.map(item => item.method2))].filter(Boolean),
                            lp_number: sortLPNumbers([...new Set(summaryCache.map(item => item.lp_number))].filter(Boolean))
                        });
                        setIsLoading(false);
                        setIsRefreshing(true);
                    } catch (renderError) {
                        console.error('Error processing cached data:', renderError);
                    }
                }
            } catch (cacheError) {
                console.warn('Silent cache load error:', cacheError);
            }

            // Safe phase 2: Force network refresh
            try {
                const networkResults = await Promise.allSettled([
                    fetchSummaryReport(true, false),
                    fetchCostData(true, false)
                ]);

                if (!isMounted) {
                    clearTimeout(safetyTimeout);
                    return;
                }

                const summaryFresh = networkResults[0].status === 'fulfilled' ? networkResults[0].value : null;
                const costFresh = networkResults[1].status === 'fulfilled' ? networkResults[1].value : [];

                if (Array.isArray(summaryFresh) && summaryFresh.length > 0) {
                    if (summaryFresh[0].date === '2025-01-28' &&
                        summaryFresh[0].lp_number === 'LP001' &&
                        summaryFresh[0].merchant === 'acom') {
                        setIsUsingMock(true);
                    } else {
                        setIsUsingMock(false);
                    }

                    const pvFresh = [];
                    const withCostsFresh = calculateCosts(summaryFresh, pvFresh, costFresh);
                    setProcessedData(withCostsFresh);
                    setFilterOptions({
                        media: [...new Set(summaryFresh.map(item => item.media))].filter(Boolean),
                        method: [...new Set(summaryFresh.map(item => item.method))].filter(Boolean),
                        method2: [...new Set(summaryFresh.map(item => item.method2))].filter(Boolean),
                        lp_number: sortLPNumbers([...new Set(summaryFresh.map(item => item.lp_number))].filter(Boolean))
                    });
                } else if (isMounted && !processedData.length) {
                    setError('表示するデータが見つかりませんでした。APIキーが正しいか、またはスプレッドシートが共有されているか確認してください。');
                }
            } catch (err) {
                console.error('Error loading fresh data:', err);
                if (isMounted && !processedData.length) {
                    setError('データの読み込みに失敗しました。オフラインか、ネットワークエラーが発生しています。');
                }
            } finally {
                clearTimeout(safetyTimeout);
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
