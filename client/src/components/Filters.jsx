
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
        <div className="filters-container">
            <h3>Analysis Filters</h3>

            <div className="filter-group date-filter-group">
                <label>Date Range (年/月/日 to 年/月/日)</label>
                <div className="date-inputs">
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleChange}
                        placeholder="開始日"
                    />
                    <span className="date-separator">to</span>
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleChange}
                        placeholder="終了日"
                    />
                </div>
            </div>

            <div className="filter-group">
                <label>Media</label>
                <select name="media" value={filters.media} onChange={handleChange}>
                    <option value="">All Media</option>
                    {options.media.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label>Method</label>
                <select name="method" value={filters.method} onChange={handleChange}>
                    <option value="">All Methods</option>
                    {options.method.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label>Method 2</label>
                <select name="method2" value={filters.method2} onChange={handleChange}>
                    <option value="">All Methods 2</option>
                    {options.method2.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label>LP Number</label>
                <select name="lp_number" value={filters.lp_number} onChange={handleChange}>
                    <option value="">All LPs</option>
                    {options.lp_number.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div className="filter-actions">
                <div className="filter-separator"></div>
                <button className="apply-button" onClick={onApply}>
                    <span className="btn-icon">🔄</span>
                    更新
                </button>
            </div>
        </div>
    );
};

export default Filters;
