import React, { useState, useMemo } from 'react';
import { ComplaintLogEntry } from '../types';
import QuickInput from './QuickInput';
import { COMMON_NOTES } from '../constants';

interface AnimalControlDashboardProps {
    logs: ComplaintLogEntry[];
    onUpdateLogs: (updatedLogs: ComplaintLogEntry[]) => void;
}

const getStatusClass = (log: ComplaintLogEntry): string => {
    switch (log.status) {
        case 'NEW': return 'new-complaint';
        case 'IN_PROGRESS': return 'in-progress-complaint';
        case 'RESOLVED': return 'resolved-complaint';
        default: return '';
    }
};

const AnimalControlDashboard: React.FC<AnimalControlDashboardProps> = ({ logs, onUpdateLogs }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [newNote, setNewNote] = useState('');

    const dogComplaints = useMemo(() => {
        return logs
            .filter(log => log.type === 'DOG')
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs]);

    const filteredComplaints = useMemo(() => {
        if (!searchTerm) return dogComplaints;
        const lowerSearch = searchTerm.toLowerCase();
        return dogComplaints.filter(log =>
            log.location.toLowerCase().includes(lowerSearch) ||
            log.details.dogDescription?.toLowerCase().includes(lowerSearch) ||
            log.details.dogBehavior?.toLowerCase().includes(lowerSearch)
        );
    }, [dogComplaints, searchTerm]);
    
    const handleUpdateLog = (updatedLog: ComplaintLogEntry) => {
        const updatedLogs = logs.map(log => log.id === updatedLog.id ? updatedLog : log);
        onUpdateLogs(updatedLogs);
    };

    const handleAddNote = (log: ComplaintLogEntry) => {
        if (!newNote.trim()) return;
        const note = {
            date: new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            text: newNote.trim(),
        };
        const updatedLog = {
            ...log,
            followUpNotes: [...(log.followUpNotes || []), note],
        };
        handleUpdateLog(updatedLog);
        setNewNote('');
    };

    const handleChangeStatus = (log: ComplaintLogEntry, status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED') => {
        const updatedLog = { ...log, status };
        handleUpdateLog(updatedLog);
    };
    
    return (
        <div className="tab-content">
            <div className="card">
                <h2>Animal Control Dashboard</h2>
                <div className="search-bar">
                    <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" placeholder="Search by location, description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {filteredComplaints.length > 0 ? (
                filteredComplaints.map(log => {
                    const statusClass = getStatusClass(log);
                    return (
                        <div key={log.id} className={`case-item ${statusClass}`} onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)} role="button" tabIndex={0}>
                            <div className="case-info">
                                <strong>{log.location}</strong>
                                <span>{log.details.dogDescription || 'No description'}</span>
                                <span style={{fontSize: '0.8rem'}}>Status: {log.status?.replace('_', ' ')} | Logged: {new Date(log.timestamp).toLocaleDateString()}</span>
                            </div>
                            
                            {expandedLogId === log.id && (
                                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--light-gray)'}}>
                                    <h4>Complaint Details</h4>
                                    <div className="form-group readonly"><label>Behavior</label><div className="form-value">{log.details.dogBehavior || 'N/A'}</div></div>
                                    <div className="form-group readonly"><label>Owner Info</label><div className="form-value">{log.details.dogOwnerInfo || 'N/A'}</div></div>
                                    {log.notes && <div className="form-group readonly"><label>Initial Notes</label><div className="form-value">{log.notes}</div></div>}
                                    
                                    <h4 style={{marginTop: '1.5rem'}}>Follow-up & Status</h4>
                                    {log.followUpNotes?.map((note, index) => (
                                        <div key={index} className="note"><div className="note-date">{note.date}</div>{note.text}</div>
                                    ))}
                                    <div className="form-group" style={{marginTop: '1rem'}}>
                                        <QuickInput
                                            label="Add New Note"
                                            value={newNote}
                                            onChange={setNewNote}
                                            placeholder="e.g., Spoke with owner..."
                                            options={COMMON_NOTES}
                                            multiline={false}
                                            separator=". "
                                        />
                                        <div style={{textAlign: 'right', marginTop: '0.5rem'}}>
                                            <button className="button" onClick={e => { e.stopPropagation(); handleAddNote(log); }}>Add</button>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Change Status</label>
                                        <div className="button-group" onClick={e => e.stopPropagation()}>
                                            <button className={`button ${log.status === 'IN_PROGRESS' ? 'primary-action' : 'secondary-action'}`} onClick={() => handleChangeStatus(log, 'IN_PROGRESS')}>In Progress</button>
                                            <button className={`button ${log.status === 'RESOLVED' ? 'primary-action' : 'secondary-action'}`} style={{backgroundColor: log.status === 'RESOLVED' ? 'var(--success-color)' : ''}} onClick={() => handleChangeStatus(log, 'RESOLVED')}>Resolved</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            ) : (
                <div className="card empty-state" style={{marginTop: '1.5rem'}}>
                    <p>No dog complaints found.</p>
                </div>
            )}
        </div>
    );
};

export default AnimalControlDashboard;