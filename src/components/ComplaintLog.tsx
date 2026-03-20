import React, { useState } from 'react';
import { ComplaintLogEntry } from '../types';
import { generateId } from '../utils';
import { VIOLATIONS_LIST, initialViolationState, DOG_BEHAVIORS, DOG_DESCRIPTORS } from '../constants';
import QuickInput from './QuickInput';

interface ComplaintLogProps {
    logs: ComplaintLogEntry[];
    onUpdateLogs: (updatedLogs: ComplaintLogEntry[]) => void;
}

const ComplaintLog: React.FC<ComplaintLogProps> = ({ logs, onUpdateLogs }) => {
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Form state
    const [callerName, setCallerName] = useState('');
    const [callerPhone, setCallerPhone] = useState('');
    const [location, setLocation] = useState('');
    const [type, setType] = useState<'CODE' | 'DOG'>('CODE');
    const [notes, setNotes] = useState('');

    // Code complaint state
    const [selectedViolation, setSelectedViolation] = useState(initialViolationState);

    // Dog complaint state
    const [dogDescription, setDogDescription] = useState('');
    const [dogBehavior, setDogBehavior] = useState('');
    const [dogOwnerInfo, setDogOwnerInfo] = useState('');
    
    const clearForm = () => {
        setCallerName('');
        setCallerPhone('');
        setLocation('');
        setNotes('');
        setSelectedViolation(initialViolationState);
        setDogDescription('');
        setDogBehavior('');
        setDogOwnerInfo('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!location) {
            alert("Location is a required field.");
            return;
        }

        const newLog: ComplaintLogEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            callerName,
            callerPhone,
            location,
            type,
            notes,
            details: type === 'CODE' ? {
                violationType: selectedViolation.type,
                ordinance: selectedViolation.ordinance,
                description: selectedViolation.description,
                correctiveAction: selectedViolation.correctiveAction,
            } : {
                dogDescription,
                dogBehavior,
                dogOwnerInfo,
            },
            ...(type === 'DOG' && { status: 'NEW', followUpNotes: [] })
        };

        const updatedLogs = [newLog, ...logs];
        onUpdateLogs(updatedLogs);
        clearForm();
    };
    
    const handleDeleteLog = (logId: string) => {
        if (window.confirm("Are you sure you want to delete this log?")) {
            const updatedLogs = logs.filter(log => log.id !== logId);
            onUpdateLogs(updatedLogs);
        }
    };
    
    const handleViolationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const violationType = e.target.value;
        const violation = VIOLATIONS_LIST.find(v => v.type === violationType) || initialViolationState;
        setSelectedViolation(violation);
    };

    return (
        <div className="tab-content">
            <form onSubmit={handleSubmit} className="card">
                <h2>Log a New Complaint</h2>
                <div className="form-group">
                    <label>Caller Name</label>
                    <input type="text" value={callerName} onChange={e => setCallerName(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Caller Phone</label>
                    <input type="tel" value={callerPhone} onChange={e => setCallerPhone(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Complaint Location / Address</label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Complaint Type</label>
                    <div className="button-group" style={{justifyContent: 'flex-start'}}>
                         <label style={{marginRight: '1rem'}}><input type="radio" name="complaintType" value="CODE" checked={type === 'CODE'} onChange={() => setType('CODE')} /> Code Complaint</label>
                         <label><input type="radio" name="complaintType" value="DOG" checked={type === 'DOG'} onChange={() => setType('DOG')} /> Dog Complaint</label>
                    </div>
                </div>

                {type === 'CODE' && (
                    <>
                        <h4>Code Violation Details</h4>
                        <div className="form-group">
                            <label>Violation Type</label>
                            <select value={selectedViolation.type} onChange={handleViolationChange}>
                                {VIOLATIONS_LIST.map(v => <option key={v.type} value={v.type}>{v.type}</option>)}
                            </select>
                        </div>
                        {selectedViolation.type !== 'Select a Violation...' && selectedViolation.type !== 'Other (Manual Entry)' && (
                            <div className="info-box">
                                <p><strong>Ordinance:</strong> {selectedViolation.ordinance}</p>
                                <p><strong>Description:</strong> {selectedViolation.description}</p>
                                <p><strong>Focus / Corrective Action:</strong> {selectedViolation.correctiveAction}</p>
                            </div>
                        )}
                    </>
                )}

                {type === 'DOG' && (
                    <>
                        <h4>Dog Complaint Details</h4>
                        <QuickInput
                            label="Dog Description (Breed, color, size)"
                            value={dogDescription}
                            onChange={setDogDescription}
                            options={DOG_DESCRIPTORS}
                            multiline={true}
                        />
                        <QuickInput
                            label="Behavior"
                            value={dogBehavior}
                            onChange={setDogBehavior}
                            options={DOG_BEHAVIORS}
                            multiline={true}
                        />
                        <div className="form-group">
                            <label>Owner Information (If known)</label>
                            <input type="text" value={dogOwnerInfo} onChange={e => setDogOwnerInfo(e.target.value)} />
                        </div>
                    </>
                )}

                <div className="form-group" style={{marginTop: '1.5rem'}}>
                    <label>General Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional details..." />
                </div>

                <div className="button-group" style={{marginTop: '1rem', justifyContent: 'flex-end'}}>
                    <button type="button" className="button secondary-action" onClick={clearForm}>Clear Form</button>
                    <button type="submit" className="button primary-action">Save Log</button>
                </div>
            </form>
            
            <div className="card" style={{marginTop: '1.5rem'}}>
                 <h2>Recent Logs</h2>
                 {logs.length > 0 ? (
                     logs.map(log => (
                        <div key={log.id} className="case-item" style={{cursor: 'pointer', marginBottom: '1rem'}} onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}>
                             <div className="case-info">
                                <strong>{log.type === 'CODE' ? `Code: ${log.details.violationType}` : 'Dog Complaint'}</strong>
                                <span>Location: {log.location}</span>
                                <span style={{fontSize: '0.8rem'}}>Logged: {new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            {expandedLogId === log.id && (
                                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--light-gray)'}}>
                                    <p><strong>Caller:</strong> {log.callerName || 'N/A'}</p>
                                    <p><strong>Phone:</strong> {log.callerPhone || 'N/A'}</p>
                                    {log.type === 'CODE' && (
                                        <>
                                            <p><strong>Ordinance:</strong> {log.details.ordinance}</p>
                                            <p><strong>Violation Details:</strong> {log.details.description}</p>
                                        </>
                                    )}
                                    {log.type === 'DOG' && (
                                        <>
                                            <p><strong>Dog Description:</strong> {log.details.dogDescription || 'N/A'}</p>
                                            <p><strong>Behavior:</strong> {log.details.dogBehavior || 'N/A'}</p>
                                            <p><strong>Owner:</strong> {log.details.dogOwnerInfo || 'N/A'}</p>
                                        </>
                                    )}
                                    {log.notes && <div className="note" style={{marginTop: '0.5rem'}}><strong>Notes:</strong> {log.notes}</div>}
                                     <div className="button-group" style={{marginTop: '1rem', justifyContent: 'flex-end'}}>
                                        <button className="button danger-action" onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id); }}>Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                     ))
                 ) : (
                     <p>No complaints have been logged yet.</p>
                 )}
            </div>
        </div>
    );
};

export default ComplaintLog;