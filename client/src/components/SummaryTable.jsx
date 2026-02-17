import React from 'react';
import '../styles/SummaryTable.css';

const SummaryTable = ({
    metrics,
    groupedData,
    unitPrices,
    unitEstRates,
    diffRate,
    onUnitPriceChange,
    onEstRateChange,
    onDiffRateChange
}) => {
    const fmtCurrency = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '-';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Math.round(val));
    };

    const fmtPercent = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '-';
        return val.toFixed(2) + '%';
    };

    const fmtNumber = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '-';
        return Math.round(val).toLocaleString();
    };

    if (!groupedData || groupedData.length === 0) {
        return <div className="no-data">表示するデータがありません。</div>;
    }

    const estAllowableCpaAdjusted = metrics.estAllowableCpa * (1 + (diffRate || 0) / 100);

    return (
        <div className="unified-report-wrapper">
            <div className="report-container">
                <table className="performance-unified-table">
                    <thead>
                        <tr className="main-header-row">
                            <th className="sticky-col"></th>
                            <th colSpan={12}>実績</th>
                            <th colSpan={5} className="est-header">想定</th>
                        </tr>
                        <tr className="sub-header-row">
                            <th className="sticky-col">商材名</th>

                            <th className="metric-col">mCV</th>
                            <th className="metric-col">mCPA</th>

                            <th className="metric-col">rCV</th>
                            <th className="metric-col">rCVR</th>
                            <th className="metric-col">rCV比率</th>

                            <th className="metric-col">成果数</th>
                            <th className="metric-col">成果率</th>
                            <th className="metric-col highlight-editable">単価</th>
                            <th className="metric-col">許容CPA</th>
                            <th className="metric-col">rCPA</th>

                            <th className="metric-col">広告費</th>
                            <th className="metric-col highlight-roas">ROAS<br />(実績)</th>

                            <th className="metric-col est highlight-editable">成果率<br />(想定)</th>
                            <th className="metric-col est">許容CPA<br />(想定)</th>
                            <th className="metric-col est-highlight highlight-editable">差分率</th>
                            <th className="metric-col est-highlight">許容CPA<br />(想定)_差分込み</th>
                            <th className="metric-col est highlight-roas-est">ROAS<br />(想定)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.map((row, index) => {
                            const mKey = row.merchant?.toLowerCase();
                            return (
                                <tr key={index}>
                                    <td className="sticky-col merchant-name-cell">
                                        <div className={`merchant-indicator ${mKey}`}></div>
                                        <span>{row.merchant?.toUpperCase() || '-'}</span>
                                    </td>

                                    <td className="val-cell">{fmtNumber(row.mCV)}</td>
                                    <td className="val-cell">-</td>

                                    <td className="val-cell">{fmtNumber(row.rCV)}</td>
                                    <td className="val-cell">{fmtPercent(row.rCVR)}</td>
                                    <td className="val-cell">{fmtPercent(row.rCVRatio)}</td>

                                    <td className="val-cell">{fmtNumber(row.results)}</td>
                                    <td className="val-cell">{fmtPercent(row.conversionRate)}</td>
                                    <td className="val-cell editable-cell">
                                        <div className="input-with-unit">
                                            <span className="unit-label">¥</span>
                                            <input
                                                type="number"
                                                className="table-input"
                                                value={unitPrices[mKey] || 0}
                                                onChange={(e) => onUnitPriceChange(mKey, e.target.value)}
                                            />
                                        </div>
                                    </td>
                                    <td className="val-cell">{fmtCurrency(row.allowableCpaPerItem)}</td>
                                    <td className="val-cell">-</td>

                                    <td className="val-cell">-</td>
                                    <td className="val-cell highlight-roas-val">-</td>

                                    <td className="val-cell est-val editable-cell">
                                        <div className="input-with-unit">
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="table-input est"
                                                value={unitEstRates[mKey] || 0}
                                                onChange={(e) => onEstRateChange(mKey, e.target.value)}
                                            />
                                            <span className="unit-label">%</span>
                                        </div>
                                    </td>
                                    <td className="val-cell est-val">{fmtCurrency(row.estAllowableCpa)}</td>
                                    <td className="val-cell est-val">-</td>
                                    <td className="val-cell est-val">-</td>
                                    <td className="val-cell highlight-roas-est-val">-</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="grand-total-row">
                            <td className="sticky-col">TOTAL</td>

                            <td className="val-cell">{fmtNumber(metrics.mCV)}</td>
                            <td className="val-cell">{fmtCurrency(metrics.mCPA)}</td>

                            <td className="val-cell">{fmtNumber(metrics.rCV)}</td>
                            <td className="val-cell">{fmtPercent(metrics.rCVR)}</td>
                            <td className="val-cell">100.00%</td>

                            <td className="val-cell">{fmtNumber(metrics.results)}</td>
                            <td className="val-cell">{fmtPercent(metrics.conversionRate)}</td>
                            <td className="val-cell">-</td>
                            <td className="val-cell">{fmtCurrency(metrics.allowableCpa)}</td>
                            <td className="val-cell">{fmtCurrency(metrics.rCPA)}</td>

                            <td className="val-cell">{fmtCurrency(metrics.cost)}</td>
                            <td className="val-cell highlight-roas-val">{fmtPercent(metrics.actualRoas)}</td>

                            <td className="val-cell est-val">-</td>
                            <td className="val-cell est-val">{fmtCurrency(metrics.estAllowableCpa)}</td>

                            <td className="val-cell est-val editable-cell">
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="table-input est"
                                        value={diffRate}
                                        onChange={(e) => onDiffRateChange(Number(e.target.value))}
                                    />
                                    <span className="unit-label">%</span>
                                </div>
                            </td>
                            <td className="val-cell est-val" style={{ fontWeight: 800, background: 'rgba(139, 92, 246, 0.1)' }}>
                                {fmtCurrency(estAllowableCpaAdjusted)}
                            </td>

                            <td className="val-cell highlight-roas-est-val">{fmtPercent(metrics.estRoas)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default SummaryTable;
