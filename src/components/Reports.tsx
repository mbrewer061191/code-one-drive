import React, { useState, useMemo } from 'react';
import { Case } from '../types';

// Helper function to get the Nth weekday of a given month
// month is 0-indexed (0 for January), dayOfWeek is 0-indexed (0 for Sunday)
const getNthWeekdayOfMonth = (year: number, month: number, dayOfWeek: number, n: number): Date => {
    const date = new Date(year, month, 1);
    let day = date.getDay();
    let dayOfMonth = 1 + (dayOfWeek - day + 7) % 7 + (n - 1) * 7;
    return new Date(year, month, dayOfMonth);
};

const Reports: React.FC<{ cases: Case[] }> = ({ cases }) => {
    const [reportDate, setReportDate] = useState(new Date());

    const { periodStart, periodEnd, filteredCases } = useMemo(() => {
        const year = reportDate.getFullYear();
        const month = reportDate.getMonth(); // 0-11

        const start = getNthWeekdayOfMonth(year, month, 2, 2); // 2nd Tuesday of the report month

        const nextMonthDate = new Date(year, month + 1, 1);
        let end = getNthWeekdayOfMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 2, 2);
        end.setDate(end.getDate() - 1); // Ends the day before the next period starts
        end.setHours(23, 59, 59, 999); // Set to end of day to be inclusive.

        const filtered = cases.filter(c => {
            const caseDate = new Date(c.dateCreated);
            return caseDate >= start && caseDate <= end;
        });

        return { periodStart: start, periodEnd: end, filteredCases: filtered };
    }, [reportDate, cases]);

    const stats = useMemo(() => {
        const total = filteredCases.length;
        const closed = filteredCases.filter(c => c.status === 'CLOSED').length;
        const active = total - closed;
        const violationCounts = filteredCases.reduce((acc, c) => {
            acc[c.violation.type] = (acc[c.violation.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return { total, closed, active, violationCounts };
    }, [filteredCases]);
    
    const changePeriod = (direction: 'prev' | 'next') => {
        setReportDate(current => {
            const newDate = new Date(current);
            newDate.setDate(1); // Avoid month-end issues
            newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
            return newDate;
        });
    };

    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="tab-content print-this">
            <div className="card report-controls no-print">
                <h2>Monthly Report</h2>
                <div className="report-period-selector">
                    <button className="button" onClick={() => changePeriod('prev')}>&larr; Previous</button>
                    <div className="period-display">
                        <p><strong>Reporting Period</strong></p>
                        <p>{formatDate(periodStart)} - {formatDate(periodEnd)}</p>
                    </div>
                    <button className="button" onClick={() => changePeriod('next')}>Next &rarr;</button>
                </div>
                 <button className="button primary-action" onClick={() => window.print()} style={{marginTop: '1rem'}}>
                    Print Report
                </button>
            </div>
            
            <div id="printable-report">
                <div className="card report-summary">
                    <h3 className="print-only-header">Report for {formatDate(periodStart)} to {formatDate(periodEnd)}</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-value">{stats.total}</span>
                            <span className="stat-label">Total Cases Created</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.closed}</span>
                            <span className="stat-label">Cases Closed</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.active}</span>
                            <span className="stat-label">Cases Remaining Active</span>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3>Case Breakdown by Violation</h3>
                    {Object.keys(stats.violationCounts).length > 0 ? (
                        <ul className="violation-list">
                           {Object.entries(stats.violationCounts).sort((a, b) => Number(b[1]) - Number(a[1])).map(([type, count]) => (
                               <li key={type}><span>{type}</span> <strong>{count}</strong></li>
                           ))}
                        </ul>
                    ) : (
                        <p>No cases with violations in this period.</p>
                    )}
                </div>

                <div className="card">
                    <h3>Cases in Period</h3>
                    {filteredCases.length > 0 ? (
                        <div className="report-case-list">
                            {filteredCases.map(c => (
                                <div key={c.id} className="report-case-item">
                                    <div className="info"><strong>{c.caseId}:</strong> {c.address.street}</div>
                                    <div className="details">
                                        <span><strong>Created:</strong> {c.dateCreated}</span>
                                        <span><strong>Status:</strong> {c.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No cases were created in this reporting period.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;