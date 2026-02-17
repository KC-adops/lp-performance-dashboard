
import React from 'react';
import '../styles/Filters.css';

const Filters = ({ filters, setFilters, options, onApply }) => {

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="filters-toolbar">
            <div className="filter-item date-range">
                <label>Date</label>
                <div className="date-inputs">
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleChange}
                    />
                    <span className="date-separator">~</span>
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleChange}
                    />
                </div>
            </div>

            <div className="filter-item">
                <label>Media</label>
                <select name="media" value={filters.media} onChange={handleChange}>
                    <option value="">All Media</option>
                    {options.media.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div className="filter-item">
                <label>Method</label>
                <select name="method" value={filters.method} onChange={handleChange}>
                    <option value="">All Methods</option>
                    {options.method.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div className="filter-item">
                <label>Method 2</label>
                <select name="method2" value={filters.method2} onChange={handleChange}>
                    <option value="">All Methods 2</option>
                    {options.method2.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div className="filter-item">
                <label>LP</label>
                <select name="lp_number" value={filters.lp_number} onChange={handleChange}>
                    <option value="">All LPs</option>
                    {options.lp_number.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <button className="toolbar-apply-button" onClick={onApply}>
                <span className="btn-icon">🔄</span>
                更新
            </button>
        </div>
    );
};

export default Filters;
