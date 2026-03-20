


import React, { useState, useEffect, useRef } from 'react';
import { Case, NoticePurpose, PhotoWithMeta, EvidencePhoto, FollowUp } from '../types';
import { generateNoticeDocument } from '../dataService';
import { VIOLATIONS_LIST, COMMON_NOTES, FOLLOW_UP_NOTES } from '../constants';
import { getCaseTimeStatus } from '../utils';
import { dataService } from '../dataService';
import AbatementManager from './AbatementManager';
import CameraView from './CameraView';
import QuickInput from './QuickInput';
import * as dailyTaskService from '../dailyTaskService';

const CaseDetails: React.FC<{ caseData: Case; onBack: () => void; onUpdate: (updatedCase: Case) => void; onDelete: (caseId: string) => void; }> = ({ caseData, onBack, onUpdate, onDelete }) => {
    const [currentCase, setCurrentCase] = useState(caseData);
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState('');
    const [genMsg, setGenMsg] = useState('');
    
    // State for editing case details
    const [isEditing, setIsEditing] = useState(false);
    const [editableCase, setEditableCase] = useState<Case>(caseData);
    
    // State for adding new evidence
    const [isSaving, setIsSaving] = useState(false);
    const [newNoteText, setNewNoteText] = useState('');
    const [newPhotos, setNewPhotos] = useState<PhotoWithMeta[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for follow-up recording
    const [showFollowUpCamera, setShowFollowUpCamera] = useState(false);
    const [followUpNotes, setFollowUpNotes] = useState('');
    const [followUpPhotos, setFollowUpPhotos] = useState<PhotoWithMeta[]>([]);
    const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
    const followUpFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCurrentCase(caseData);
        setEditableCase(caseData);
    }, [caseData]);

    const statusClass = getCaseTimeStatus(currentCase);

    const handleGenerate = async (purpose: NoticePurpose) => {
        setIsGenerating(true);
        setGenError('');
        setGenMsg('');
        try {
            const docs = await generateNoticeDocument(purpose, currentCase);
            docs.forEach(d => window.open(d.docUrl, '_blank'));
            
            const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const updatedCase = { ...currentCase };
            updatedCase.notices.unshift({ title: docs[0].title, docUrl: docs[0].docUrl, date: today });
            
            if (purpose === 'FAILURE') updatedCase.status = 'FAILURE-NOTICED';
            
            onUpdate(updatedCase);
            dailyTaskService.addToCertMailQueue(updatedCase);
            setGenMsg(`Success! Case #${updatedCase.caseId} has been added to the mailing queue.`);

        } catch (e: any) {
            setGenError(`Failed: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStartAbatement = () => {
        if (window.confirm("Forward this case for City Abatement? This will start the Statement of Cost and Lien process.")) {
            const updatedCase: Case = { ...currentCase, status: 'PENDING_ABATEMENT', abatement: { ...currentCase.abatement, status: 'NEEDS_ABATEMENT' } };
            onUpdate(updatedCase);
        }
    };
    
    const handleSaveChanges = () => {
        onUpdate(editableCase);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditableCase(currentCase);
        setIsEditing(false);
    };

    const handleArchive = async () => {
        setIsSaving(true);
        try {
            await dataService.downloadCaseArchive(currentCase);
        } catch (e) {
            console.error(e);
            alert("Failed to download archive.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCourtPacket = async () => {
        setIsSaving(true);
        try {
            await dataService.downloadCourtPacket(currentCase);
        } catch (e) {
            console.error(e);
            alert("Failed to generate court packet.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEvidence = async () => {
        if (!newNoteText.trim() && newPhotos.length === 0) return;
        setIsSaving(true);
        setGenError('');
        try {
            const uploadedPhotos: EvidencePhoto[] = await dataService.uploadCasePhotos(newPhotos, currentCase);
            const newNote = { date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), text: newNoteText.trim() };
            const updatedCase = { ...currentCase, evidence: { ...currentCase.evidence, photos: [...(currentCase.evidence.photos || []), ...uploadedPhotos], notes: [...currentCase.evidence.notes, newNote] } };
            onUpdate(updatedCase);
            setNewNoteText('');
            setNewPhotos([]);
        } catch (e: any) {
            setGenError(`Failed to save evidence: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        // FIX: Explicitly type 'file' as File to prevent type inference errors.
        // This resolves issues where 'file' was being incorrectly typed as '{}' or 'unknown',
        // causing errors in both the Promise resolution and the readAsDataURL call.
        const newPhotosPromises = Array.from(files).map((file: File) => new Promise<PhotoWithMeta>(res => {
            const reader = new FileReader();
            reader.onload = () => res({ file, dataUrl: reader.result as string });
            reader.readAsDataURL(file);
        }));
        Promise.all(newPhotosPromises).then(newPs => setNewPhotos(prev => [...prev, ...newPs]));
    };

    const handleDeleteNewPhoto = (index: number) => {
        setNewPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveFollowUp = async () => {
        if (!followUpNotes.trim() && followUpPhotos.length === 0) return;
        setIsSavingFollowUp(true);
        setGenError('');
        try {
            const uploadedPhotos: EvidencePhoto[] = await dataService.uploadFollowUpPhotos(followUpPhotos, currentCase);
            const newFollowUp: FollowUp = {
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                notes: followUpNotes.trim(),
                photos: uploadedPhotos
            };
            const updatedCase = { 
                ...currentCase, 
                followUps: [...(currentCase.followUps || []), newFollowUp] 
            };
            onUpdate(updatedCase);
            setFollowUpNotes('');
            setFollowUpPhotos([]);
        } catch (e: any) {
            setGenError(`Failed to save follow-up: ${e.message}`);
        } finally {
            setIsSavingFollowUp(false);
        }
    };

    const handleFollowUpFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newPhotosPromises = Array.from(files).map((file: File) => new Promise<PhotoWithMeta>(res => {
            const reader = new FileReader();
            reader.onload = () => res({ file, dataUrl: reader.result as string });
            reader.readAsDataURL(file);
        }));
        Promise.all(newPhotosPromises).then(newPs => setFollowUpPhotos(prev => [...prev, ...newPs]));
    };

    const handleDeleteFollowUpPhoto = (index: number) => {
        setFollowUpPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleCloseCase = () => {
        if (window.confirm("Are you sure you want to close this case? It will be moved to the archive and hidden from active lists.")) {
            const updatedCase: Case = { ...currentCase, status: 'CLOSED' };
            onUpdate(updatedCase);
        }
    };

    const handleReopenCase = () => {
        const updatedCase: Case = { ...currentCase, status: 'ACTIVE' };
        onUpdate(updatedCase);
    };

    return (
        <div className="tab-content">
            {showCamera && <CameraView mode="single-case" onDone={(p) => { setNewPhotos(prev => [...prev, ...p]); setShowCamera(false); }} onCancel={() => setShowCamera(false)} />}
            {showFollowUpCamera && <CameraView mode="single-case" onDone={(p) => { setFollowUpPhotos(prev => [...prev, ...p]); setShowFollowUpCamera(false); }} onCancel={() => setShowFollowUpCamera(false)} />}
            
            <button onClick={onBack} className="button secondary-action no-print">&larr; Back to List</button>

            <div className={`card ${statusClass}`} style={{ borderLeft: '8px solid' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>{currentCase.address.street}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Case #{currentCase.caseId} | {currentCase.status.replace('-', ' ')}</p>
                    <div className="button-group">
                        {currentCase.status !== 'CLOSED' && (
                            <button className="button secondary-action" style={{ minHeight: '36px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleCloseCase}>
                                Close Case
                            </button>
                        )}
                        {currentCase.status !== 'PENDING_ABATEMENT' && currentCase.status !== 'CLOSED' && (
                            <button className="button" style={{ backgroundColor: 'var(--abatement-color)', minHeight: '36px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleStartAbatement}>
                                Forward to Abatement &rarr;
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {currentCase.status === 'PENDING_ABATEMENT' && <AbatementManager caseData={currentCase} onUpdate={onUpdate} />}

            <div className="card">
                {isEditing ? (
                    <>
                        <div className="editing-header">
                            <h3>Editing Case Details</h3>
                            <div className="button-group">
                                <button className="button secondary-action" onClick={handleCancelEdit}>Cancel</button>
                                <button className="button primary-action" onClick={handleSaveChanges}>Save</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Street Address</label>
                            <input type="text" value={editableCase.address.street} onChange={e => setEditableCase({...editableCase, address: {...editableCase.address, street: e.target.value}})} />
                        </div>
                        <div className="form-group"><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input type="checkbox" checked={editableCase.isVacant} onChange={e => setEditableCase({...editableCase, isVacant: e.target.checked})} /> Mark as vacant</label></div>
                        
                        <h4>Owner Information</h4>
                        <div className="form-group"><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input type="checkbox" checked={editableCase.ownerInfoStatus === 'UNKNOWN'} onChange={e => setEditableCase({...editableCase, ownerInfoStatus: e.target.checked ? 'UNKNOWN' : 'KNOWN' })} /> Owner information is unknown</label></div>
                        <div className="form-group">
                            <label>Owner Name</label>
                            <input type="text" value={editableCase.ownerInfo.name} onChange={e => setEditableCase({...editableCase, ownerInfo: {...editableCase.ownerInfo, name: e.target.value}})} disabled={editableCase.ownerInfoStatus === 'UNKNOWN'} />
                        </div>
                        <div className="form-group">
                            <label>Mailing Address</label>
                            <textarea value={editableCase.ownerInfo.mailingAddress} onChange={e => setEditableCase({...editableCase, ownerInfo: {...editableCase.ownerInfo, mailingAddress: e.target.value}})} disabled={editableCase.ownerInfoStatus === 'UNKNOWN'} />
                        </div>

                        <h4>Violation Details</h4>
                        <div className="form-group">
                            <label>Violation Type</label>
                            <select value={editableCase.violation.type} onChange={e => setEditableCase({...editableCase, violation: VIOLATIONS_LIST.find(v => v.type === e.target.value) || editableCase.violation})}>
                                {VIOLATIONS_LIST.map(v => <option key={v.type} value={v.type}>{v.type}</option>)}
                            </select>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h2>Owner & Property Details</h2>
                            <button className="button" onClick={() => setIsEditing(true)}>Edit Case Details</button>
                        </div>
                        <div className="form-group readonly"><label>Owner Info</label><div className="form-value">{currentCase.ownerInfo.name}<br/>{currentCase.ownerInfo.mailingAddress}</div></div>
                        <div className="form-group readonly"><label>Violation</label><div className="form-value"><strong>{currentCase.violation.type}</strong><br/>{currentCase.violation.description}</div></div>
                    </>
                )}
            </div>
            
            <div className="card">
                <h2>Evidence Locker</h2>
                <h4>Notes ({currentCase.evidence.notes.length})</h4>
                <div className="notes-list">
                    {currentCase.evidence.notes.map((note, i) => <div key={i} className="note"><div className="note-date">{note.date}</div>{note.text}</div>)}
                </div>
                <h4 style={{marginTop: '1.5rem'}}>Photos ({(currentCase.evidence.photos || []).length})</h4>
                <div className="photo-gallery">
                    {(currentCase.evidence.photos || []).map(p => <div key={p.id} className="photo-thumbnail"><a href={p.webViewLink} target="_blank" rel="noopener noreferrer"><img src={p.url} alt="Evidence" /></a></div>)}
                </div>
                
                {currentCase.notices && currentCase.notices.length > 0 && (
                    <>
                        <h4 style={{marginTop: '1.5rem'}}>Generated Notices ({currentCase.notices.length})</h4>
                        <div className="notices-list">
                            {currentCase.notices.map((notice, index) => (
                                <a 
                                    key={index} 
                                    href={notice.docUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="notice-item"
                                >
                                    <div className="notice-info">
                                        <strong>{notice.title}</strong>
                                        <span>Generated: {notice.date}</span>
                                    </div>
                                    <div className="notice-action">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="card no-print">
                <h2>Record Follow-Up</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Document the results of the notice. Photos taken here will include a timestamp for court evidence.
                </p>
                <div className="form-group">
                    <label>Follow-Up Notes</label>
                    <div className="button-group" style={{ marginBottom: '0.5rem' }}>
                        <button className="button secondary-action" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem' }} onClick={() => setFollowUpNotes("Phone call with owner")}>📞 Phone Call</button>
                        <button className="button secondary-action" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem' }} onClick={() => setFollowUpNotes("Left voicemail")}>📟 Voicemail</button>
                        <button className="button secondary-action" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem' }} onClick={() => setFollowUpNotes("Spoke with owner in person")}>👤 In Person</button>
                    </div>
                    <QuickInput value={followUpNotes} onChange={setFollowUpNotes} options={FOLLOW_UP_NOTES} placeholder="What was the result of the inspection?"/>
                </div>
                <h4>Follow-Up Photos (Optional) ({followUpPhotos.length})</h4>
                 <div className="photo-gallery">
                    {followUpPhotos.map((p, i) => (
                        <div key={i} className="photo-thumbnail-container">
                            <button type="button" className="delete-photo-btn" onClick={() => handleDeleteFollowUpPhoto(i)}>&times;</button>
                            <div className="photo-thumbnail"><img src={p.dataUrl} alt="New follow-up evidence" /></div>
                        </div>
                    ))}
                </div>
                <div className="button-group" style={{marginTop: '1rem'}}>
                    <button className="button" onClick={() => setShowFollowUpCamera(true)}>Open Camera (Timestamped)</button>
                    <button className="button secondary-action" onClick={() => followUpFileInputRef.current?.click()}>Upload File</button>
                    <input type="file" ref={followUpFileInputRef} style={{ display: 'none' }} multiple accept="image/*" onChange={handleFollowUpFileUpload} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button className="button primary-action" onClick={handleSaveFollowUp} disabled={isSavingFollowUp || (!followUpNotes.trim() && followUpPhotos.length === 0)} style={{ flex: 2, backgroundColor: 'var(--success-color)' }}>
                        {isSavingFollowUp ? <span className="loader" /> : 'Save Follow-Up Record'}
                    </button>
                    {currentCase.status !== 'CLOSED' && (
                        <button className="button secondary-action" onClick={() => {
                            setFollowUpNotes("Compliance met - closing case");
                            handleSaveFollowUp().then(() => handleCloseCase());
                        }} style={{ flex: 1 }}>
                            Complied & Close
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                <h2>Follow-Up History</h2>
                {(!currentCase.followUps || currentCase.followUps.length === 0) ? (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No follow-up records yet.</p>
                ) : (
                    <div className="follow-up-list">
                        {currentCase.followUps.map((fu, i) => (
                            <div key={i} className="follow-up-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fu.date}</span>
                                </div>
                                <p>{fu.notes}</p>
                                {fu.photos && fu.photos.length > 0 && (
                                    <div className="photo-gallery">
                                        {fu.photos.map(p => (
                                            <div key={p.id} className="photo-thumbnail">
                                                <a href={p.webViewLink} target="_blank" rel="noopener noreferrer">
                                                    <img src={p.url} alt="Follow-up evidence" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="card no-print">
                <h2>Add Evidence</h2>
                <div className="form-group">
                    <label>New Note</label>
                    <div className="button-group" style={{ marginBottom: '0.5rem' }}>
                        <button className="button secondary-action" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem' }} onClick={() => setNewNoteText("Phone call with owner")}>📞 Phone Call</button>
                        <button className="button secondary-action" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem' }} onClick={() => setNewNoteText("Left voicemail")}>📟 Voicemail</button>
                    </div>
                    <QuickInput value={newNoteText} onChange={setNewNoteText} options={COMMON_NOTES} placeholder="Add a note..."/>
                </div>
                <h4>Add Photos (Optional) ({newPhotos.length})</h4>
                 <div className="photo-gallery">
                    {newPhotos.map((p, i) => (
                        <div key={i} className="photo-thumbnail-container">
                            <button type="button" className="delete-photo-btn" onClick={() => handleDeleteNewPhoto(i)}>&times;</button>
                            <div className="photo-thumbnail"><img src={p.dataUrl} alt="New evidence" /></div>
                        </div>
                    ))}
                </div>
                <div className="button-group" style={{marginTop: '1rem'}}>
                    <button className="button" onClick={() => setShowCamera(true)}>Open Camera</button>
                    <button className="button secondary-action" onClick={() => fileInputRef.current?.click()}>Upload File</button>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept="image/*" onChange={handleFileUpload} />
                </div>
                 <button className="button primary-action full-width" onClick={handleSaveEvidence} disabled={isSaving || (!newNoteText.trim() && newPhotos.length === 0)} style={{marginTop: '1.5rem'}}>
                    {isSaving ? <span className="loader" /> : 'Save Evidence'}
                </button>
            </div>

            <div className="card no-print">
                <h2>Generate Notices</h2>
                <div className="button-group">
                    <button className="button" onClick={() => handleGenerate('INITIAL')} disabled={isGenerating}>Initial Notice</button>
                    <button className="button danger-action" onClick={() => handleGenerate('FAILURE')} disabled={isGenerating}>Issue Abatement Notice</button>
                </div>
                 {genError && <div className="error-message" style={{marginTop: '1rem'}}>{genError}</div>}
                 {genMsg && <div className="success-message" style={{marginTop: '1rem'}}>{genMsg}</div>}
            </div>

            <div className="card no-print">
                <h2>Case Management</h2>
                <div className="button-group">
                    {currentCase.status === 'CLOSED' ? (
                        <button className="button primary-action" onClick={handleReopenCase} style={{ backgroundColor: 'var(--success-color)' }}>Reopen Case</button>
                    ) : (
                        <button className="button secondary-action" onClick={handleCloseCase}>Close Case (Complied)</button>
                    )}
                    <button className="button secondary-action" onClick={handleArchive} disabled={isSaving}>
                        {isSaving ? 'Processing...' : 'Download Archive'}
                    </button>
                    <button className="button secondary-action" onClick={handleCourtPacket} disabled={isSaving} style={{ borderColor: 'var(--abatement-color)', color: 'var(--abatement-color)' }}>
                        {isSaving ? 'Processing...' : 'Generate Court Packet'}
                    </button>
                    <button className="button danger-action" onClick={() => onDelete(currentCase.id)}>Delete Entire Case File</button>
                </div>
            </div>
        </div>
    );
};

export default CaseDetails;