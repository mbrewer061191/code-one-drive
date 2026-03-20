

import React, { useState, useMemo } from 'react';
import { Case, AbatementStatus } from '../types';
import { getCaseTimeStatus, compareStreets } from '../utils';

const getStatusClass = (c: Case): string => {
    if (c.status === 'CLOSED') return 'closed';
    if (c.status === 'PENDING_ABATEMENT') return 'abatement';
    if (c.status === 'CONTINUAL_ABATEMENT') return 'continual-abatement';
    return getCaseTimeStatus(c);
};

interface CaseListProps {
    cases: Case[];
    onSelectCase: (caseId: string) => void;
    onNewCase: () => void;
    listType?: 'all' | 'due' | 'abatement' | 'continual-abatement';
    onGenerateReport?: () => void;
}

const CaseItemRow: React.FC<{ c: Case; onSelect: () => void; showExpiry?: boolean; subtitle?: string; badge?: string; badgeClass?: string }> = ({ c, onSelect, showExpiry, subtitle, badge, badgeClass }) => {
    const statusClass = getStatusClass(c);
    
    let displayStatus = '';
    if (c.status === 'PENDING_ABATEMENT') displayStatus = 'Abatement';
    else if (c.status === 'CONTINUAL_ABATEMENT') displayStatus = 'Continual';
    else if (c.status === 'CLOSED') displayStatus = 'Closed';
    else displayStatus = 'Active';

    let expiryDateText = '';
    if (showExpiry && c.abatement?.workDate) {
        const workDate = new Date(c.abatement.workDate.replace(/-/g, '\/'));
        if (!isNaN(workDate.getTime())) {
            workDate.setMonth(workDate.getMonth() + 6);
            expiryDateText = `Expires: ${workDate.toLocaleDateString()}`;
        }
    }

    return (
        <div className={`case-item ${statusClass}`} onClick={onSelect} role="button" tabIndex={0} aria-label={`View case ${c.caseId}`}>
            <div className="case-info">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem'}}>
                    <strong>{c.address.street}</strong>
                    {badge ? (
                        <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            borderRadius: '99px', 
                            fontWeight: 700, 
                            textTransform: 'uppercase',
                            backgroundColor: badgeClass ? `var(${badgeClass})` : 'var(--primary-color)',
                            color: 'white'
                        }}>{badge}</span>
                    ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>{displayStatus.toUpperCase()}</span>
                    )}
                </div>
                
                {c.ownerInfoStatus === 'UNKNOWN' && (
                     <span style={{ fontSize: '0.75rem', backgroundColor: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, display: 'inline-block', marginBottom: '0.25rem' }}>Owner Unknown</span>
                )}
                
                <span>{subtitle ? subtitle : (c.ownerInfo?.name || 'No Owner Listed')}</span>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                    <span>#{c.caseId}</span>
                    <span>{expiryDateText}</span>
                </div>
            </div>
        </div>
    );
};

const CaseList: React.FC<CaseListProps> = ({ cases, onSelectCase, onNewCase, listType = 'all', onGenerateReport }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('OPEN');
    const [sortOrder, setSortOrder] = useState('street');

    const filterOptions = [
        { value: 'OPEN', label: 'All Open Cases' },
        { value: 'ALL', label: 'Archive (Include Closed)' },
        { value: 'ABATEMENT', label: 'Ready for Abatement' },
        { value: 'VACANT', label: 'Vacant Properties' },
        { value: 'DILAPIDATED', label: 'Dilapidated Structures' },
        { value: 'UNKNOWN_OWNER', label: 'Unknown Owner' },
        { value: 'TALL_GRASS', label: 'Tall Grass / Weeds' },
        { value: 'INOPERABLE_VEHICLE', label: 'Inoperable Vehicles' },
    ];

    const filteredCases = useMemo(() => {
        let intermediateCases = [...cases];

        const filterFunctions: Record<string, (c: Case) => boolean> = {
            'OPEN': c => c.status !== 'CLOSED',
            'ABATEMENT': c => c.status === 'PENDING_ABATEMENT',
            'VACANT': c => c.isVacant,
            'DILAPIDATED': c => c.violation.type === 'Dilapidated Structure',
            'UNKNOWN_OWNER': c => c.ownerInfoStatus === 'UNKNOWN',
            'TALL_GRASS': c => c.violation.type === 'Tall Grass / Weeds',
            'INOPERABLE_VEHICLE': c => c.violation.type === 'Inoperable / Abandoned Vehicle'
        };

        if (filter !== 'ALL' && filterFunctions[filter]) {
            intermediateCases = intermediateCases.filter(filterFunctions[filter]);
        }

        const sortedCases = intermediateCases.sort((a, b) => {
            if (listType === 'abatement') {
                const statusOrder: Record<string, number> = { 'NEEDS_ABATEMENT': 0, 'STATEMENT_FILED': 1, 'LIEN_FILED': 2, 'LIEN_CERTIFIED': 3 };
                const statA = a.abatement?.status || 'NEEDS_ABATEMENT';
                const statB = b.abatement?.status || 'NEEDS_ABATEMENT';
                if (statusOrder[statA] !== statusOrder[statB]) return statusOrder[statA] - statusOrder[statB];
                return compareStreets(a.address.street, b.address.street); 
            }
            
            if (sortOrder === 'recent') {
                return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
            }

            // Default 'street' sort
            if (a.status === 'CLOSED' && b.status !== 'CLOSED') return 1;
            if (a.status !== 'CLOSED' && b.status === 'CLOSED') return -1;
            return compareStreets(a.address.street, b.address.street);
        });

        if (!searchTerm) return sortedCases;
        return sortedCases.filter(c => 
            c.address.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.ownerInfo.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [cases, searchTerm, filter, listType, sortOrder]);

    const getLienWaitStatus = (dateStr?: string): { daysLeft: number, ready: boolean } => {
        if (!dateStr) return { daysLeft: 30, ready: false };
        const start = new Date(dateStr);
        const now = new Date();
        start.setHours(0,0,0,0);
        now.setHours(0,0,0,0);
        const diffTime = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = 30 - diffDays;
        return { 
            daysLeft: Math.max(0, daysLeft),
            ready: diffDays >= 30 
        };
    };

    const renderAbatementGroups = () => {
        const groups: Record<string, { cases: Case[], info: string, colorClass: string }> = {
            'Needs Abatement': { cases: [], info: 'Work needs to be performed or documented.', colorClass: '--danger-color' },
            'Statement Filed': { cases: [], info: 'Work done. Waiting to file Lien.', colorClass: '--primary-color' },
            'Lien Waiting Period': { cases: [], info: 'Notice of Lien filed. Waiting 30 days.', colorClass: '--warning-color' },
            'Action Required': { cases: [], info: '30-day period expired. Ready for Certificate of Lien.', colorClass: '--abatement-color' },
            'Finalized': { cases: [], info: 'Lien Certified or Released.', colorClass: '--success-color' }
        };

        filteredCases.forEach(c => {
            const status = c.abatement?.status || 'NEEDS_ABATEMENT';
            if (status === 'NEEDS_ABATEMENT') {
                groups['Needs Abatement'].cases.push(c);
            } else if (status === 'STATEMENT_FILED') {
                groups['Statement Filed'].cases.push(c);
            } else if (status === 'LIEN_FILED') {
                const { ready } = getLienWaitStatus(c.abatement?.noticeOfLienDate);
                if (ready) {
                    groups['Action Required'].cases.push(c);
                } else {
                    groups['Lien Waiting Period'].cases.push(c);
                }
            } else if (status === 'LIEN_CERTIFIED' || status === 'LIEN_RELEASED') {
                groups['Finalized'].cases.push(c);
            } else {
                groups['Needs Abatement'].cases.push(c);
            }
        });

        return (
            <div className="abatement-groups">
                {Object.entries(groups).map(([groupName, data]) => (
                    <div key={groupName} style={{marginBottom: '2rem'}}>
                        <h3 style={{
                            fontSize: '1rem',
                            borderBottom: '2px solid var(--border-color)', 
                            paddingBottom: '0.5rem',
                            color: `var(${data.colorClass})`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {groupName} 
                            <span style={{
                                fontSize: '0.85rem', 
                                backgroundColor: data.cases.length > 0 ? `var(${data.colorClass})` : 'var(--bg-color)', 
                                color: data.cases.length > 0 ? 'white' : 'var(--text-secondary)', 
                                padding: '2px 10px', 
                                borderRadius: '99px'
                            }}>
                                {data.cases.length}
                            </span>
                        </h3>
                        
                        {data.cases.length > 0 ? (
                            data.cases.map(c => {
                                let subtitle = c.ownerInfo?.name || 'Unknown Owner';
                                let badge = undefined;
                                let badgeClass = undefined;
                                
                                if (groupName === 'Lien Waiting Period') {
                                    const { daysLeft } = getLienWaitStatus(c.abatement?.noticeOfLienDate);
                                    badge = `${daysLeft} Days Left`;
                                    badgeClass = '--warning-color';
                                    subtitle = `Filed: ${c.abatement?.noticeOfLienDate || 'Unknown'}`;
                                } else if (groupName === 'Action Required') {
                                    badge = 'READY TO CERTIFY';
                                    badgeClass = '--success-color';
                                }

                                return (
                                    <CaseItemRow 
                                        key={c.id} 
                                        c={c} 
                                        onSelect={() => onSelectCase(c.id)} 
                                        showExpiry={listType === 'continual-abatement'}
                                        subtitle={subtitle}
                                        badge={badge}
                                        badgeClass={badgeClass}
                                    />
                                );
                            })
                        ) : (
                            <p style={{color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.95rem', padding: '0.5rem'}}>No cases in this stage.</p>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="tab-content">
            <div className="search-bar">
                 <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Search cases..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="filters-container">
                {listType === 'all' && (
                    <div className="form-group">
                        <label htmlFor="case-filter">Filter By</label>
                        <select id="case-filter" value={filter} onChange={e => setFilter(e.target.value)}>
                            {filterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                )}
                 {listType !== 'abatement' && (
                    <div className="form-group">
                        <label htmlFor="case-sort">Sort By</label>
                        <select id="case-sort" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                            <option value="street">Street Address</option>
                            <option value="recent">Most Recent</option>
                        </select>
                    </div>
                )}
            </div>


             {listType === 'abatement' && onGenerateReport && (
                 <button className="button full-width" onClick={onGenerateReport} style={{marginBottom: '1rem', backgroundColor: 'var(--abatement-color)'}}>Generate Abatement Report</button>
            )}
            
            <button className="button primary-action full-width" onClick={onNewCase} style={{ boxShadow: 'var(--shadow-md)' }}>Create New Case</button>
            
            <div style={{marginTop: '2rem'}}>
                {filteredCases.length > 0 ? (
                    listType === 'abatement' ? (
                        renderAbatementGroups()
                    ) : (
                        filteredCases.map(c => (
                            <CaseItemRow 
                                key={c.id} 
                                c={c} 
                                onSelect={() => onSelectCase(c.id)} 
                                showExpiry={listType === 'continual-abatement'} 
                            />
                        ))
                    )
                ) : ( <div className="card empty-state"><p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>No cases found matching your criteria.</p></div> )}
            </div>
        </div>
    );
};

export default CaseList;